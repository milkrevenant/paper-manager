use rusqlite::{params, Connection};
use uuid::Uuid;
use crate::error::AppError;
use crate::models::{PdfPage, FullTextSearchResult, FullTextSearchQuery, FullTextSearchResponse};

/// Insert or replace a page's text content
pub fn insert_pdf_page(
    conn: &Connection,
    paper_id: &str,
    page_number: i32,
    text_content: &str,
) -> Result<PdfPage, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        r#"INSERT OR REPLACE INTO pdf_pages (id, paper_id, page_number, text_content, created_at)
           VALUES (?, ?, ?, ?, ?)"#,
        params![id, paper_id, page_number, text_content, now],
    )?;

    Ok(PdfPage {
        id,
        paper_id: paper_id.to_string(),
        page_number,
        text_content: text_content.to_string(),
        created_at: now,
    })
}

/// Delete all pages for a paper (for re-indexing)
pub fn delete_pdf_pages(conn: &Connection, paper_id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM pdf_pages WHERE paper_id = ?", [paper_id])?;
    Ok(())
}

/// Mark paper as indexed
pub fn mark_paper_indexed(conn: &Connection, paper_id: &str) -> Result<(), AppError> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE papers SET is_indexed = 1, indexed_at = ? WHERE id = ?",
        params![now, paper_id],
    )?;
    Ok(())
}

/// Full-text search with snippet extraction
pub fn search_pdf_content(
    conn: &Connection,
    query: &FullTextSearchQuery,
) -> Result<FullTextSearchResponse, AppError> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    // Sanitize query for FTS5
    let search_query = sanitize_fts_query(&query.query);
    if search_query.is_empty() {
        return Ok(FullTextSearchResponse { total: 0, results: vec![] });
    }

    let (results, total) = match &query.folder_id {
        Some(folder_id) => search_with_folder(conn, &search_query, folder_id, limit, offset)?,
        None => search_all(conn, &search_query, limit, offset)?,
    };

    Ok(FullTextSearchResponse { total, results })
}

fn search_with_folder(
    conn: &Connection,
    search_query: &str,
    folder_id: &str,
    limit: i32,
    offset: i32,
) -> Result<(Vec<FullTextSearchResult>, i32), AppError> {
    let mut stmt = conn.prepare(
        r#"
        SELECT
            pp.paper_id,
            p.title,
            p.author,
            pp.page_number,
            snippet(pdf_pages_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
            bm25(pdf_pages_fts) as rank
        FROM pdf_pages_fts
        JOIN pdf_pages pp ON pdf_pages_fts.rowid = pp.rowid
        JOIN papers p ON pp.paper_id = p.id
        WHERE pdf_pages_fts MATCH ?
        AND p.folder_id = ?
        ORDER BY rank
        LIMIT ? OFFSET ?
        "#,
    )?;

    let mut results = Vec::new();
    let rows = stmt.query_map(params![search_query, folder_id, limit, offset], |row| {
        Ok(FullTextSearchResult {
            paper_id: row.get(0)?,
            paper_title: row.get(1)?,
            paper_author: row.get(2)?,
            page_number: row.get(3)?,
            snippet: row.get(4)?,
            rank: row.get(5)?,
        })
    })?;

    for result in rows {
        results.push(result?);
    }

    let total: i32 = conn.query_row(
        r#"SELECT COUNT(*) FROM pdf_pages_fts
           JOIN pdf_pages pp ON pdf_pages_fts.rowid = pp.rowid
           JOIN papers p ON pp.paper_id = p.id
           WHERE pdf_pages_fts MATCH ? AND p.folder_id = ?"#,
        params![search_query, folder_id],
        |r| r.get(0),
    )?;

    Ok((results, total))
}

fn search_all(
    conn: &Connection,
    search_query: &str,
    limit: i32,
    offset: i32,
) -> Result<(Vec<FullTextSearchResult>, i32), AppError> {
    let mut stmt = conn.prepare(
        r#"
        SELECT
            pp.paper_id,
            p.title,
            p.author,
            pp.page_number,
            snippet(pdf_pages_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
            bm25(pdf_pages_fts) as rank
        FROM pdf_pages_fts
        JOIN pdf_pages pp ON pdf_pages_fts.rowid = pp.rowid
        JOIN papers p ON pp.paper_id = p.id
        WHERE pdf_pages_fts MATCH ?
        ORDER BY rank
        LIMIT ? OFFSET ?
        "#,
    )?;

    let mut results = Vec::new();
    let rows = stmt.query_map(params![search_query, limit, offset], |row| {
        Ok(FullTextSearchResult {
            paper_id: row.get(0)?,
            paper_title: row.get(1)?,
            paper_author: row.get(2)?,
            page_number: row.get(3)?,
            snippet: row.get(4)?,
            rank: row.get(5)?,
        })
    })?;

    for result in rows {
        results.push(result?);
    }

    let total: i32 = conn.query_row(
        "SELECT COUNT(*) FROM pdf_pages_fts WHERE pdf_pages_fts MATCH ?",
        params![search_query],
        |r| r.get(0),
    )?;

    Ok((results, total))
}

/// Get papers that haven't been indexed yet
pub fn get_unindexed_papers(conn: &Connection) -> Result<Vec<(String, String)>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, pdf_path FROM papers WHERE COALESCE(is_indexed, 0) = 0 AND pdf_path != ''"
    )?;

    let mut papers = Vec::new();
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    for paper in rows {
        papers.push(paper?);
    }

    Ok(papers)
}

/// Sanitize user input for FTS5 query
fn sanitize_fts_query(query: &str) -> String {
    // Remove special FTS5 operators and wrap each word in quotes for literal matching
    let cleaned: String = query
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '_')
        .collect();

    // Split into words and join with spaces
    cleaned
        .split_whitespace()
        .map(|word| format!("\"{}\"", word))
        .collect::<Vec<_>>()
        .join(" ")
}
