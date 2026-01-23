use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::error::AppError;

fn get_pdf_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))?;
    let pdf_dir = app_data.join("pdfs");

    if !pdf_dir.exists() {
        std::fs::create_dir_all(&pdf_dir)?;
    }

    Ok(pdf_dir)
}

#[tauri::command]
pub fn import_pdf(app: AppHandle, source_path: String, paper_id: String) -> Result<String, AppError> {
    let pdf_dir = get_pdf_dir(&app)?;
    let source = PathBuf::from(&source_path);

    let filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("paper.pdf");

    let dest_filename = format!("{}_{}", paper_id, filename);
    let dest_path = pdf_dir.join(&dest_filename);

    std::fs::copy(&source, &dest_path)?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_pdf_as_base64(pdf_path: String) -> Result<String, AppError> {
    let bytes = std::fs::read(&pdf_path)?;
    Ok(STANDARD.encode(&bytes))
}

#[tauri::command]
pub fn delete_pdf(pdf_path: String) -> Result<(), AppError> {
    let path = PathBuf::from(&pdf_path);
    if path.exists() {
        std::fs::remove_file(&path)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_pdf_storage_path(app: AppHandle) -> Result<String, AppError> {
    let pdf_dir = get_pdf_dir(&app)?;
    Ok(pdf_dir.to_string_lossy().to_string())
}
