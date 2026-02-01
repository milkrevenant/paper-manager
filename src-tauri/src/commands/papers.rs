use tauri::{AppHandle, Emitter, State};

use crate::db::DbConnection;
use crate::error::AppError;
use crate::models::{CreatePaperInput, Paper, UpdatePaperInput};

#[tauri::command]
pub fn get_papers(
    db: State<'_, DbConnection>,
    folder_id: Option<String>,
    sort_by: Option<String>,
) -> Result<Vec<Paper>, AppError> {
    let conn = db.get()?;
    crate::db::papers::get_papers(&conn, folder_id, sort_by)
}

#[tauri::command]
pub fn get_paper(db: State<'_, DbConnection>, paper_id: String) -> Result<Paper, AppError> {
    let conn = db.get()?;
    crate::db::papers::get_paper(&conn, &paper_id)
}

#[tauri::command]
pub fn create_paper(
    app: AppHandle,
    db: State<'_, DbConnection>,
    input: CreatePaperInput,
) -> Result<Paper, AppError> {
    let conn = db.get()?;
    let paper = crate::db::papers::create_paper(&conn, input)?;
    let _ = app.emit("papers-changed", &paper.folder_id);
    Ok(paper)
}

#[tauri::command]
pub fn update_paper(
    app: AppHandle,
    db: State<'_, DbConnection>,
    paper_id: String,
    input: UpdatePaperInput,
) -> Result<Paper, AppError> {
    let conn = db.get()?;
    let paper = crate::db::papers::update_paper(&conn, &paper_id, input)?;
    let _ = app.emit("papers-changed", &paper.folder_id);
    Ok(paper)
}

#[tauri::command]
pub fn delete_paper(
    app: AppHandle,
    db: State<'_, DbConnection>,
    paper_id: String,
) -> Result<(), AppError> {
    let conn = db.get()?;
    let paper = crate::db::papers::get_paper(&conn, &paper_id)?;
    crate::db::papers::delete_paper(&conn, &paper_id)?;
    let _ = app.emit("papers-changed", &paper.folder_id);
    Ok(())
}

#[tauri::command]
pub fn check_duplicate(db: State<'_, DbConnection>, title: String) -> Result<bool, AppError> {
    let conn = db.get()?;
    crate::db::papers::check_duplicate(&conn, &title)
}

/// Batch update multiple papers with the same changes
#[tauri::command]
pub fn batch_update_papers(
    app: AppHandle,
    db: State<'_, DbConnection>,
    paper_ids: Vec<String>,
    input: UpdatePaperInput,
) -> Result<Vec<Paper>, AppError> {
    let conn = db.get()?;
    let mut updated_papers = Vec::new();
    let mut affected_folders = std::collections::HashSet::new();

    for paper_id in paper_ids {
        let paper = crate::db::papers::update_paper(&conn, &paper_id, input.clone())?;
        affected_folders.insert(paper.folder_id.clone());
        updated_papers.push(paper);
    }

    // Emit change events for all affected folders
    for folder_id in affected_folders {
        let _ = app.emit("papers-changed", &folder_id);
    }

    Ok(updated_papers)
}

/// Batch delete multiple papers
#[tauri::command]
pub fn batch_delete_papers(
    app: AppHandle,
    db: State<'_, DbConnection>,
    paper_ids: Vec<String>,
) -> Result<(), AppError> {
    let conn = db.get()?;
    let mut affected_folders = std::collections::HashSet::new();

    for paper_id in &paper_ids {
        let paper = crate::db::papers::get_paper(&conn, paper_id)?;
        affected_folders.insert(paper.folder_id.clone());
        crate::db::papers::delete_paper(&conn, paper_id)?;
    }

    // Emit change events for all affected folders
    for folder_id in affected_folders {
        let _ = app.emit("papers-changed", &folder_id);
    }

    Ok(())
}
