use tauri::{AppHandle, Emitter, State};

use crate::db::DbConnection;
use crate::error::AppError;
use crate::models::{CreateHighlightInput, Highlight, UpdateHighlightInput};

#[tauri::command]
pub fn get_highlights(
    db: State<'_, DbConnection>,
    paper_id: String,
    page_number: Option<i32>,
) -> Result<Vec<Highlight>, AppError> {
    let conn = db.get()?;
    crate::db::highlights::get_highlights(&conn, &paper_id, page_number)
}

#[tauri::command]
pub fn get_highlight(
    db: State<'_, DbConnection>,
    highlight_id: String,
) -> Result<Highlight, AppError> {
    let conn = db.get()?;
    crate::db::highlights::get_highlight(&conn, &highlight_id)
}

#[tauri::command]
pub fn create_highlight(
    app: AppHandle,
    db: State<'_, DbConnection>,
    input: CreateHighlightInput,
) -> Result<Highlight, AppError> {
    let conn = db.get()?;
    let highlight = crate::db::highlights::create_highlight(&conn, input)?;
    let _ = app.emit("highlights-changed", &highlight.paper_id);
    Ok(highlight)
}

#[tauri::command]
pub fn update_highlight(
    app: AppHandle,
    db: State<'_, DbConnection>,
    highlight_id: String,
    input: UpdateHighlightInput,
) -> Result<Highlight, AppError> {
    let conn = db.get()?;
    let highlight = crate::db::highlights::update_highlight(&conn, &highlight_id, input)?;
    let _ = app.emit("highlights-changed", &highlight.paper_id);
    Ok(highlight)
}

#[tauri::command]
pub fn delete_highlight(
    app: AppHandle,
    db: State<'_, DbConnection>,
    highlight_id: String,
) -> Result<(), AppError> {
    let conn = db.get()?;
    let highlight = crate::db::highlights::get_highlight(&conn, &highlight_id)?;
    crate::db::highlights::delete_highlight(&conn, &highlight_id)?;
    let _ = app.emit("highlights-changed", &highlight.paper_id);
    Ok(())
}
