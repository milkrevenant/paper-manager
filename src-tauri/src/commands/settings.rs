use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use crate::db::{settings, DbConnection};
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub gemini_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub default_font_family: Option<String>,
    pub default_font_size: Option<String>,
    pub storage_path: Option<String>,
    pub google_account_email: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            gemini_api_key: None,
            openai_api_key: None,
            default_font_family: Some("sans-serif".to_string()),
            default_font_size: Some("12".to_string()),
            storage_path: None,
            google_account_email: None,
        }
    }
}

/// Get all app settings
#[tauri::command]
pub fn get_settings(db: State<'_, DbConnection>) -> Result<AppSettings, AppError> {
    let conn = db.get()?;
    let all_settings = settings::get_all_settings(&conn)?;

    let map: HashMap<String, String> = all_settings.into_iter().collect();

    Ok(AppSettings {
        gemini_api_key: map.get("gemini_api_key").cloned(),
        openai_api_key: map.get("openai_api_key").cloned(),
        default_font_family: map.get("default_font_family").cloned().or(Some("sans-serif".to_string())),
        default_font_size: map.get("default_font_size").cloned().or(Some("12".to_string())),
        storage_path: map.get("storage_path").cloned(),
        google_account_email: map.get("google_account_email").cloned(),
    })
}

/// Get a single setting by key
#[tauri::command]
pub fn get_setting(db: State<'_, DbConnection>, key: String) -> Result<Option<String>, AppError> {
    let conn = db.get()?;
    settings::get_setting(&conn, &key)
}

/// Set a single setting
#[tauri::command]
pub fn set_setting(db: State<'_, DbConnection>, key: String, value: String) -> Result<(), AppError> {
    let conn = db.get()?;
    settings::set_setting(&conn, &key, &value)
}

/// Update multiple settings at once
#[tauri::command]
pub fn update_settings(db: State<'_, DbConnection>, settings_map: HashMap<String, String>) -> Result<(), AppError> {
    let conn = db.get()?;
    for (key, value) in settings_map {
        settings::set_setting(&conn, &key, &value)?;
    }
    Ok(())
}

/// Delete a setting
#[tauri::command]
pub fn delete_setting(db: State<'_, DbConnection>, key: String) -> Result<(), AppError> {
    let conn = db.get()?;
    settings::delete_setting(&conn, &key)
}
