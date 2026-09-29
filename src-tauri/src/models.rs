use serde::{Deserialize, Serialize};

/// 计划完整结构（DB 行 → 前端）。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub id: String,
    pub title: String,
    pub description: String,
    /// 开始日期，ISO `YYYY-MM-DD`，仅日期不含时间。
    pub start_date: String,
    /// 结束日期，ISO `YYYY-MM-DD`，包含关系（起止均含）。
    pub end_date: String,
    pub tags: Vec<String>,
    pub archived: bool,
    /// ISO 8601 UTC 时间戳（仅用于展示，不影响日期字段）。
    pub created_at: String,
    pub updated_at: String,
}

/// 新建/编辑计划的输入载荷。
#[derive(Debug, Clone, Deserialize)]
pub struct PlanInput {
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// 导入结果报告。
#[derive(Debug, Clone, Serialize)]
pub struct ImportReport {
    pub imported: usize,
    pub failed: usize,
    pub errors: Vec<ImportError>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportError {
    pub index: usize,
    pub reason: String,
}

/// 当前导出/导入文件格式版本。
pub const SCHEMA_VERSION: i64 = 1;
