mod commands;
mod db;
mod models;
mod validate;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let db_path = dir.join("timeline.db");
            let conn = db::open(&db_path)?;
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_plans,
            commands::get_plan,
            commands::create_plan,
            commands::update_plan,
            commands::delete_plan,
            commands::set_archived,
            commands::export_json,
            commands::import_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
