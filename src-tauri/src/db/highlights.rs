use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{CreateHighlightInput, Highlight, HighlightRect, UpdateHighlightInput};

fn parse_rects(json: &str) -> Vec<HighlightRect> {
    serde_json::from_str(json).unwrap_or_default()
}

fn to_json_rects(rects: &[HighlightRect]) -> String {
    serde_json::to_string(rects).unwrap_or_else(|_| "[]".to_string())
}

fn row_to_highlight(row: &rusqlite::Row) -> rusqlite::Result<Highlight> {
    Ok(Highlight {
        id: row.get(0)?,
        paper_id: row.get(1)?,
        page_number: row.get(2)?,
        rects: parse_rects(&row.get::<_, String>(3)?),
        selected_text: row.get(4)?,
        color: row.get(5)?,
        note: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

const SELECT_COLUMNS: &str = "id, paper_id, page_number, rects, selected_text, color, note, created_at, updated_at";

pub fn get_highlights(
    conn: &Connection,
    paper_id: &str,
    page_number: Option<i32>,
) -> Result<Vec<Highlight>, AppError> {
    if let Some(page) = page_number {
        let query = format!(
            "SELECT {} FROM highlights WHERE paper_id = ? AND page_number = ? ORDER BY created_at ASC",
            SELECT_COLUMNS
        );
        let mut stmt = conn.prepare(&query)?;
        let highlights = stmt
            .query_map(params![paper_id, page], row_to_highlight)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(highlights)
    } else {
        let query = format!(
            "SELECT {} FROM highlights WHERE paper_id = ? ORDER BY page_number ASC, created_at ASC",
            SELECT_COLUMNS
        );
        let mut stmt = conn.prepare(&query)?;
        let highlights = stmt
            .query_map([paper_id], row_to_highlight)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(highlights)
    }
}

pub fn get_highlight(conn: &Connection, highlight_id: &str) -> Result<Highlight, AppError> {
    let query = format!("SELECT {} FROM highlights WHERE id = ?", SELECT_COLUMNS);
    let mut stmt = conn.prepare(&query)?;

    stmt.query_row([highlight_id], row_to_highlight)
        .map_err(|_| AppError::NotFound(format!("Highlight not found: {}", highlight_id)))
}

pub fn create_highlight(
    conn: &Connection,
    input: CreateHighlightInput,
) -> Result<Highlight, AppError> {
    let id = Uuid::new_v4().to_string();
    let rects_json = to_json_rects(&input.rects);
    let color = input.color.unwrap_or_else(|| "#FFFF00".to_string());
    let note = input.note.unwrap_or_default();

    conn.execute(
        "INSERT INTO highlights (id, paper_id, page_number, rects, selected_text, color, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            input.paper_id,
            input.page_number,
            rects_json,
            input.selected_text,
            color,
            note,
        ],
    )?;

    get_highlight(conn, &id)
}

pub fn update_highlight(
    conn: &Connection,
    highlight_id: &str,
    input: UpdateHighlightInput,
) -> Result<Highlight, AppError> {
    let highlight = get_highlight(conn, highlight_id)?;

    let color = input.color.unwrap_or(highlight.color);
    let note = input.note.unwrap_or(highlight.note);

    conn.execute(
        "UPDATE highlights SET color = ?, note = ?, updated_at = datetime('now') WHERE id = ?",
        params![color, note, highlight_id],
    )?;

    get_highlight(conn, highlight_id)
}

pub fn delete_highlight(conn: &Connection, highlight_id: &str) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM highlights WHERE id = ?", [highlight_id])?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "Highlight not found: {}",
            highlight_id
        )));
    }

    Ok(())
}
