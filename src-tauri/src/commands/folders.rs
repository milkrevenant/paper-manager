use tauri::{AppHandle, Emitter, State};

use crate::db::DbConnection;
use crate::error::AppError;
use crate::models::{CreateFolderInput, Folder, UpdateFolderInput};

#[tauri::command]
pub fn get_folders(db: State<'_, DbConnection>, topic_id: String) -> Result<Vec<Folder>, AppError> {
    let conn = db.get()?;
    crate::db::folders::get_folders(&conn, &topic_id)
}

#[tauri::command]
pub fn get_all_folders(db: State<'_, DbConnection>) -> Result<Vec<Folder>, AppError> {
    let conn = db.get()?;
    crate::db::folders::get_all_folders(&conn)
}

#[tauri::command]
pub fn get_folder(db: State<'_, DbConnection>, folder_id: String) -> Result<Folder, AppError> {
    let conn = db.get()?;
    crate::db::folders::get_folder(&conn, &folder_id)
}

#[tauri::command]
pub fn create_folder(
    app: AppHandle,
    db: State<'_, DbConnection>,
    input: CreateFolderInput,
) -> Result<Folder, AppError> {
    let conn = db.get()?;
    let folder = crate::db::folders::create_folder(&conn, input)?;
    let _ = app.emit("folders-changed", &folder.topic_id);
    Ok(folder)
}

#[tauri::command]
pub fn update_folder(
    app: AppHandle,
    db: State<'_, DbConnection>,
    folder_id: String,
    input: UpdateFolderInput,
) -> Result<Folder, AppError> {
    let conn = db.get()?;
    let folder = crate::db::folders::update_folder(&conn, &folder_id, input)?;
    let _ = app.emit("folders-changed", &folder.topic_id);
    Ok(folder)
}

#[tauri::command]
pub fn delete_folder(
    app: AppHandle,
    db: State<'_, DbConnection>,
    folder_id: String,
) -> Result<(), AppError> {
    let conn = db.get()?;
    let folder = crate::db::folders::get_folder(&conn, &folder_id)?;
    crate::db::folders::delete_folder(&conn, &folder_id)?;
    let _ = app.emit("folders-changed", &folder.topic_id);
    Ok(())
}
