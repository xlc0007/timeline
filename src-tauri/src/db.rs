use crate::models::{ImportError, ImportReport, Plan, SCHEMA_VERSION};
use crate::validate;
use rusqlite::{params, Connection};
use std::path::Path;
use uuid::Uuid;

/// 当前 UTC 时间戳（ISO 8601，仅用于创建/更新时间展示）。
pub fn now_utc() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// 本地今天（`YYYY-MM-DD`，无时区偏移）。
pub fn today_local() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

/// 打开数据库并执行迁移。
pub fn open(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    migrate(&conn)?;
    Ok(conn)
}

/// 基于 `PRAGMA user_version` 的顺序迁移。
pub fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version < 1 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS plans (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                start_date  TEXT NOT NULL,
                end_date    TEXT NOT NULL,
                tags        TEXT NOT NULL DEFAULT '[]',
                archived    INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );",
        )?;
        conn.pragma_update(None, "user_version", 1)?;
    }
    Ok(())
}

fn row_to_plan(row: &rusqlite::Row) -> rusqlite::Result<Plan> {
    let tags_json: String = row.get("tags")?;
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
    let archived_int: i64 = row.get("archived")?;
    Ok(Plan {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        start_date: row.get("start_date")?,
        end_date: row.get("end_date")?,
        tags,
        archived: archived_int != 0,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

const SELECT_COLS: &str = "id, title, description, start_date, end_date, tags, archived, created_at, updated_at";

pub fn list(conn: &Connection) -> rusqlite::Result<Vec<Plan>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_COLS} FROM plans ORDER BY start_date ASC, id ASC"
    ))?;
    let rows = stmt.query_map([], row_to_plan)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

pub fn get(conn: &Connection, id: &str) -> rusqlite::Result<Option<Plan>> {
    let mut stmt = conn.prepare(&format!("SELECT {SELECT_COLS} FROM plans WHERE id = ?1"))?;
    let mut rows = stmt.query_map(params![id], row_to_plan)?;
    match rows.next() {
        Some(r) => Ok(Some(r?)),
        None => Ok(None),
    }
}

pub fn insert(conn: &Connection, plan: &Plan) -> rusqlite::Result<()> {
    let tags_json = serde_json::to_string(&plan.tags).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "INSERT INTO plans (id, title, description, start_date, end_date, tags, archived, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            plan.id,
            plan.title,
            plan.description,
            plan.start_date,
            plan.end_date,
            tags_json,
            if plan.archived { 1 } else { 0 },
            plan.created_at,
            plan.updated_at
        ],
    )?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn update(
    conn: &Connection,
    id: &str,
    title: String,
    description: String,
    start_date: String,
    end_date: String,
    tags: &[String],
    updated_at: String,
) -> rusqlite::Result<bool> {
    let tags_json = serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string());
    let n = conn.execute(
        "UPDATE plans SET title=?2, description=?3, start_date=?4, end_date=?5, tags=?6, updated_at=?7 WHERE id=?1",
        params![id, title, description, start_date, end_date, tags_json, updated_at],
    )?;
    Ok(n > 0)
}

pub fn delete(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
    let n = conn.execute("DELETE FROM plans WHERE id = ?1", params![id])?;
    Ok(n > 0)
}

pub fn set_archived(conn: &Connection, id: &str, archived: bool, updated_at: String) -> rusqlite::Result<bool> {
    let n = conn.execute(
        "UPDATE plans SET archived=?2, updated_at=?3 WHERE id=?1",
        params![id, if archived { 1 } else { 0 }, updated_at],
    )?;
    Ok(n > 0)
}

fn id_exists(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
    let n: i64 = conn.query_row("SELECT COUNT(*) FROM plans WHERE id = ?1", params![id], |r| r.get(0))?;
    Ok(n > 0)
}

fn parse_import_plan(item: &serde_json::Value) -> Result<Plan, String> {
    let obj = item.as_object().ok_or("计划项必须是对象")?;

    let title = obj
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if title.is_empty() {
        return Err("标题不能为空".to_string());
    }

    let start_date = obj
        .get("start_date")
        .and_then(|v| v.as_str())
        .ok_or("缺少 start_date")?
        .to_string();
    let end_date = obj
        .get("end_date")
        .and_then(|v| v.as_str())
        .ok_or("缺少 end_date")?
        .to_string();
    validate::validate_range(&start_date, &end_date)?;

    let id = obj
        .get("id")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let description = obj.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();

    let tags: Vec<String> = obj
        .get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|t| t.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let archived = obj.get("archived").and_then(|v| v.as_bool()).unwrap_or(false);

    let now = now_utc();
    let created_at = obj
        .get("created_at")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_else(|| now.clone());
    let updated_at = obj
        .get("updated_at")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or(now);

    Ok(Plan {
        id,
        title,
        description,
        start_date,
        end_date,
        tags,
        archived,
        created_at,
        updated_at,
    })
}

/// 导入 JSON：先逐条校验，再事务写入；任一条写入失败即整体回滚，不破坏既有数据。
pub fn import_json(conn: &mut Connection, json: &str) -> Result<ImportReport, String> {
    let value: serde_json::Value =
        serde_json::from_str(json).map_err(|e| format!("JSON 解析失败：{e}"))?;

    let schema_version = value
        .get("schemaVersion")
        .and_then(|v| v.as_i64())
        .ok_or("缺少 schemaVersion 字段")?;
    if schema_version != SCHEMA_VERSION {
        return Err(format!(
            "不支持的 schemaVersion：{schema_version}（当前支持 {SCHEMA_VERSION}）"
        ));
    }

    let plans = value
        .get("plans")
        .and_then(|v| v.as_array())
        .ok_or("缺少 plans 数组")?;

    let mut to_insert: Vec<Plan> = Vec::new();
    let mut errors: Vec<ImportError> = Vec::new();

    for (idx, item) in plans.iter().enumerate() {
        match parse_import_plan(item) {
            Ok(mut plan) => {
                // id 冲突处理：已存在则生成新 UUID，避免覆盖既有数据。
                if id_exists(conn, &plan.id).map_err(|e| e.to_string())? {
                    plan.id = Uuid::new_v4().to_string();
                }
                to_insert.push(plan);
            }
            Err(reason) => errors.push(ImportError { index: idx, reason }),
        }
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for plan in &to_insert {
        insert(&tx, plan).map_err(|e| format!("写入失败：{e}"))?;
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(ImportReport {
        imported: to_insert.len(),
        failed: errors.len(),
        errors,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mem() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        conn
    }

    fn sample(id: &str, start: &str, end: &str) -> Plan {
        Plan {
            id: id.to_string(),
            title: format!("计划-{id}"),
            description: String::new(),
            start_date: start.to_string(),
            end_date: end.to_string(),
            tags: vec!["a".to_string(), "b".to_string()],
            archived: false,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn migrate_sets_user_version() {
        let conn = mem();
        let v: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
        assert_eq!(v, 1);
    }

    #[test]
    fn insert_and_list_roundtrip_tags() {
        let conn = mem();
        insert(&conn, &sample("1", "2024-01-01", "2024-01-10")).unwrap();
        let all = list(&conn).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].tags, vec!["a", "b"]);
        assert!(!all[0].archived);
    }

    #[test]
    fn update_bumps_updated_at_and_persists() {
        let conn = mem();
        insert(&conn, &sample("1", "2024-01-01", "2024-01-10")).unwrap();
        let n = update(
            &conn,
            "1",
            "新标题".to_string(),
            String::new(),
            "2024-02-01".to_string(),
            "2024-02-10".to_string(),
            &["x".to_string()],
            "2024-02-01T01:00:00Z".to_string(),
        )
        .unwrap();
        assert!(n);
        let p = get(&conn, "1").unwrap().unwrap();
        assert_eq!(p.title, "新标题");
        assert_eq!(p.start_date, "2024-02-01");
        assert_eq!(p.updated_at, "2024-02-01T01:00:00Z");
        assert_eq!(p.tags, vec!["x"]);
    }

    #[test]
    fn delete_removes() {
        let conn = mem();
        insert(&conn, &sample("1", "2024-01-01", "2024-01-10")).unwrap();
        assert!(delete(&conn, "1").unwrap());
        assert!(get(&conn, "1").unwrap().is_none());
        assert!(!delete(&conn, "1").unwrap());
    }

    #[test]
    fn archive_toggle() {
        let conn = mem();
        insert(&conn, &sample("1", "2024-01-01", "2024-01-10")).unwrap();
        assert!(set_archived(&conn, "1", true, "now".to_string()).unwrap());
        assert!(get(&conn, "1").unwrap().unwrap().archived);
        assert!(set_archived(&conn, "1", false, "now".to_string()).unwrap());
        assert!(!get(&conn, "1").unwrap().unwrap().archived);
    }

    #[test]
    fn import_rejects_bad_schema_version() {
        let mut conn = mem();
        let bad = r#"{"schemaVersion": 999, "plans": []}"#;
        assert!(import_json(&mut conn, bad).is_err());
    }

    #[test]
    fn import_partial_success_and_validation() {
        let mut conn = mem();
        let json = r#"{
            "schemaVersion": 1,
            "exportedAt": "2024-01-01T00:00:00Z",
            "plans": [
                {"id":"a","title":"OK","start_date":"2024-01-01","end_date":"2024-01-10","tags":["x"]},
                {"id":"b","title":"坏","start_date":"2024-02-10","end_date":"2024-02-01"},
                {"id":"c","title":"","start_date":"2024-03-01","end_date":"2024-03-02"}
            ]
        }"#;
        let report = import_json(&mut conn, json).unwrap();
        assert_eq!(report.imported, 1);
        assert_eq!(report.failed, 2);
        assert_eq!(report.errors.len(), 2);
        assert_eq!(list(&conn).unwrap().len(), 1);
    }

    #[test]
    fn import_id_conflict_gets_new_uuid() {
        let mut conn = mem();
        insert(&conn, &sample("existing", "2024-01-01", "2024-01-10")).unwrap();
        let json = r#"{
            "schemaVersion": 1,
            "plans": [
                {"id":"existing","title":"重复ID","start_date":"2024-05-01","end_date":"2024-05-10"}
            ]
        }"#;
        let report = import_json(&mut conn, json).unwrap();
        assert_eq!(report.imported, 1);
        assert_eq!(report.failed, 0);
        let all = list(&conn).unwrap();
        assert_eq!(all.len(), 2);
        // 原有数据未被覆盖
        assert_eq!(all[0].title, "计划-existing");
    }

    #[test]
    fn import_invalid_json_is_error() {
        let mut conn = mem();
        assert!(import_json(&mut conn, "not json").is_err());
    }
}
