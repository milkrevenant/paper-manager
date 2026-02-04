use tauri::{AppHandle, Emitter, State};

use crate::db::DbConnection;
use crate::error::AppError;
use crate::models::{
    CreateWritingDocumentInput, CreateWritingProjectInput, MoveWritingDocumentInput,
    UpdateWritingDocumentInput, UpdateWritingProjectInput, WritingDocument, WritingProject,
};

// ============================================================================
// Writing Project Commands
// ============================================================================

#[tauri::command]
pub fn get_writing_projects(db: State<'_, DbConnection>) -> Result<Vec<WritingProject>, AppError> {
    let conn = db.get()?;
    crate::db::writing::get_writing_projects(&conn)
}

#[tauri::command]
pub fn get_writing_project(
    db: State<'_, DbConnection>,
    project_id: String,
) -> Result<WritingProject, AppError> {
    let conn = db.get()?;
    crate::db::writing::get_writing_project(&conn, &project_id)
}

#[tauri::command]
pub fn create_writing_project(
    app: AppHandle,
    db: State<'_, DbConnection>,
    input: CreateWritingProjectInput,
) -> Result<WritingProject, AppError> {
    let conn = db.get()?;
    let project = crate::db::writing::create_writing_project(&conn, input)?;
    let _ = app.emit("writing-projects-changed", ());
    Ok(project)
}

#[tauri::command]
pub fn update_writing_project(
    app: AppHandle,
    db: State<'_, DbConnection>,
    project_id: String,
    input: UpdateWritingProjectInput,
) -> Result<WritingProject, AppError> {
    let conn = db.get()?;
    let project = crate::db::writing::update_writing_project(&conn, &project_id, input)?;
    let _ = app.emit("writing-projects-changed", ());
    Ok(project)
}

#[tauri::command]
pub fn delete_writing_project(
    app: AppHandle,
    db: State<'_, DbConnection>,
    project_id: String,
) -> Result<(), AppError> {
    let conn = db.get()?;
    crate::db::writing::delete_writing_project(&conn, &project_id)?;
    let _ = app.emit("writing-projects-changed", ());
    Ok(())
}

#[tauri::command]
pub fn open_writing_project(
    db: State<'_, DbConnection>,
    project_id: String,
) -> Result<WritingProject, AppError> {
    let conn = db.get()?;
    crate::db::writing::update_project_last_opened(&conn, &project_id)?;
    crate::db::writing::get_writing_project(&conn, &project_id)
}

// ============================================================================
// Writing Document Commands
// ============================================================================

#[tauri::command]
pub fn get_writing_documents(
    db: State<'_, DbConnection>,
    project_id: String,
) -> Result<Vec<WritingDocument>, AppError> {
    let conn = db.get()?;
    crate::db::writing::get_writing_documents(&conn, &project_id)
}

#[tauri::command]
pub fn get_writing_document(
    db: State<'_, DbConnection>,
    document_id: String,
) -> Result<WritingDocument, AppError> {
    let conn = db.get()?;
    crate::db::writing::get_writing_document(&conn, &document_id)
}

#[tauri::command]
pub fn create_writing_document(
    app: AppHandle,
    db: State<'_, DbConnection>,
    input: CreateWritingDocumentInput,
) -> Result<WritingDocument, AppError> {
    let conn = db.get()?;
    let project_id = input.project_id.clone();
    let document = crate::db::writing::create_writing_document(&conn, input)?;
    let _ = app.emit("writing-documents-changed", &project_id);
    Ok(document)
}

#[tauri::command]
pub fn update_writing_document(
    app: AppHandle,
    db: State<'_, DbConnection>,
    document_id: String,
    input: UpdateWritingDocumentInput,
) -> Result<WritingDocument, AppError> {
    let conn = db.get()?;
    let document = crate::db::writing::update_writing_document(&conn, &document_id, input)?;
    let _ = app.emit("writing-documents-changed", &document.project_id);
    Ok(document)
}

#[tauri::command]
pub fn delete_writing_document(
    app: AppHandle,
    db: State<'_, DbConnection>,
    document_id: String,
) -> Result<(), AppError> {
    let conn = db.get()?;
    let document = crate::db::writing::get_writing_document(&conn, &document_id)?;
    crate::db::writing::delete_writing_document(&conn, &document_id)?;
    let _ = app.emit("writing-documents-changed", &document.project_id);
    Ok(())
}

#[tauri::command]
pub fn move_writing_document(
    app: AppHandle,
    db: State<'_, DbConnection>,
    document_id: String,
    input: MoveWritingDocumentInput,
) -> Result<WritingDocument, AppError> {
    let conn = db.get()?;
    let document = crate::db::writing::move_writing_document(&conn, &document_id, input)?;
    let _ = app.emit("writing-documents-changed", &document.project_id);
    Ok(document)
}

// ============================================================================
// Export Commands
// ============================================================================

#[tauri::command]
pub fn export_project_markdown(
    db: State<'_, DbConnection>,
    project_id: String,
) -> Result<String, AppError> {
    let conn = db.get()?;
    crate::db::writing::export_project_markdown(&conn, &project_id)
}
