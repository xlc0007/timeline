use crate::models::{ImportReport, Plan, PlanInput};
use crate::validate;
use crate::{db, AppState};
use rusqlite::Connection;
use std::sync::MutexGuard;
use tauri::State;
use uuid::Uuid;

fn lock<'a>(state: &'a State<'a, AppState>) -> MutexGuard<'a, Connection> {
    state.db.lock().expect("db lock poisoned")
}

#[tauri::command]
pub fn list_plans(state: State<AppState>) -> Result<Vec<Plan>, String> {
    db::list(&lock(&state)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_plan(state: State<AppState>, id: String) -> Result<Option<Plan>, String> {
    db::get(&lock(&state), &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_plan(state: State<AppState>, input: PlanInput) -> Result<Plan, String> {
    let today = db::today_local();
    validate::validate_new_plan(&input, &today)?;
    let now = db::now_utc();
    let plan = Plan {
        id: Uuid::new_v4().to_string(),
        title: input.title.trim().to_string(),
        description: input.description,
        start_date: input.start_date,
        end_date: input.end_date,
        tags: input.tags,
        archived: false,
        created_at: now.clone(),
        updated_at: now,
    };
    db::insert(&lock(&state), &plan).map_err(|e| e.to_string())?;
    Ok(plan)
}

#[tauri::command]
pub fn update_plan(state: State<AppState>, id: String, input: PlanInput) -> Result<Plan, String> {
    validate::validate_edit_plan(&input)?;
    let now = db::now_utc();
    let updated = db::update(
        &lock(&state),
        &id,
        input.title.trim().to_string(),
        input.description,
        input.start_date,
        input.end_date,
        &input.tags,
        now,
    )
    .map_err(|e| e.to_string())?;
    if !updated {
        return Err("计划不存在".to_string());
    }
    db::get(&lock(&state), &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "计划不存在".to_string())
}

#[tauri::command]
pub fn delete_plan(state: State<AppState>, id: String) -> Result<(), String> {
    let n = db::delete(&lock(&state), &id).map_err(|e| e.to_string())?;
    if n {
        Ok(())
    } else {
        Err("计划不存在".to_string())
    }
}

#[tauri::command]
pub fn set_archived(state: State<AppState>, id: String, archived: bool) -> Result<(), String> {
    let n = db::set_archived(&lock(&state), &id, archived, db::now_utc()).map_err(|e| e.to_string())?;
    if n {
        Ok(())
    } else {
        Err("计划不存在".to_string())
    }
}

#[tauri::command]
pub fn export_json(state: State<AppState>) -> Result<String, String> {
    let plans = db::list(&lock(&state)).map_err(|e| e.to_string())?;
    let payload = serde_json::json!({
        "schemaVersion": crate::models::SCHEMA_VERSION,
        "exportedAt": db::now_utc(),
        "plans": plans,
    });
    serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_json(state: State<AppState>, json: String) -> Result<ImportReport, String> {
    let mut guard = lock(&state);
    db::import_json(&mut guard, &json)
}
