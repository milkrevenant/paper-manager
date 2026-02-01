use std::path::Path;
use tauri::{AppHandle, Emitter, State};
use crate::db::DbConnection;
use crate::error::AppError;
use crate::models::{FullTextSearchQuery, FullTextSearchResponse, IndexingStatus};

/// Extract text from a PDF file using pdf-extract
fn extract_pdf_text(pdf_path: &str) -> Result<String, AppError> {
    let path = Path::new(pdf_path);
    if !path.exists() {
        return Err(AppError::NotFound(format!("PDF not found: {}", pdf_path)));
    }

    pdf_extract::extract_text(path)
        .map_err(|e| AppError::Parse(format!("Failed to extract PDF text: {}", e)))
}

/// Index a single paper's PDF content
#[tauri::command]
pub fn index_paper(
    app: AppHandle,
    db: State<'_, DbConnection>,
    paper_id: String,
) -> Result<IndexingStatus, AppError> {
    let conn = db.get()?;

    // Get paper's PDF path
    let pdf_path: String = conn.query_row(
        "SELECT pdf_path FROM papers WHERE id = ?",
        [&paper_id],
        |row| row.get(0),
    ).map_err(|_| AppError::NotFound("Paper not found".to_string()))?;

    if pdf_path.is_empty() {
        return Ok(IndexingStatus {
            paper_id: paper_id.clone(),
            total_pages: 0,
            indexed_pages: 0,
            is_complete: false,
            error: Some("No PDF file attached".to_string()),
        });
    }

    // Extract text from PDF
    let text = match extract_pdf_text(&pdf_path) {
        Ok(t) => t,
        Err(e) => {
            return Ok(IndexingStatus {
                paper_id: paper_id.clone(),
                total_pages: 0,
                indexed_pages: 0,
                is_complete: false,
                error: Some(e.to_string()),
            });
        }
    };

    // Clear existing pages for this paper
    crate::db::pdf_content::delete_pdf_pages(&conn, &paper_id)?;

    // For now, treat entire PDF as one page (pdf-extract doesn't provide page-by-page)
    // This can be enhanced later with per-page extraction
    let total_pages = 1;
    crate::db::pdf_content::insert_pdf_page(&conn, &paper_id, 1, &text)?;

    // Mark as indexed
    crate::db::pdf_content::mark_paper_indexed(&conn, &paper_id)?;

    // Emit event to notify frontend
    let _ = app.emit("paper-indexed", &paper_id);

    Ok(IndexingStatus {
        paper_id,
        total_pages,
        indexed_pages: total_pages,
        is_complete: true,
        error: None,
    })
}

/// Index all unindexed papers
#[tauri::command]
pub fn index_all_papers(
    app: AppHandle,
    db: State<'_, DbConnection>,
) -> Result<Vec<IndexingStatus>, AppError> {
    let conn = db.get()?;
    let papers = crate::db::pdf_content::get_unindexed_papers(&conn)?;
    drop(conn); // Release connection before looping

    let mut results = Vec::new();
    for (paper_id, _pdf_path) in papers {
        let status = index_paper(app.clone(), db.clone(), paper_id)?;
        results.push(status);
    }

    Ok(results)
}

/// Full-text search across all PDFs
#[tauri::command]
pub fn search_full_text(
    db: State<'_, DbConnection>,
    query: FullTextSearchQuery,
) -> Result<FullTextSearchResponse, AppError> {
    let conn = db.get()?;
    crate::db::pdf_content::search_pdf_content(&conn, &query)
}

/// Check if a paper has been indexed
#[tauri::command]
pub fn get_paper_index_status(
    db: State<'_, DbConnection>,
    paper_id: String,
) -> Result<bool, AppError> {
    let conn = db.get()?;

    let is_indexed: i32 = conn.query_row(
        "SELECT COALESCE(is_indexed, 0) FROM papers WHERE id = ?",
        [&paper_id],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(is_indexed == 1)
}
