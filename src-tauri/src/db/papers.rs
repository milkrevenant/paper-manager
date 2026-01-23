use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{CreatePaperInput, Paper, UpdatePaperInput};

fn parse_json_array(json: &str) -> Vec<String> {
    serde_json::from_str(json).unwrap_or_default()
}

fn to_json_array(vec: &[String]) -> String {
    serde_json::to_string(vec).unwrap_or_else(|_| "[]".to_string())
}

fn row_to_paper(row: &rusqlite::Row) -> rusqlite::Result<Paper> {
    Ok(Paper {
        id: row.get(0)?,
        folder_id: row.get(1)?,
        paper_number: row.get(2)?,
        keywords: row.get(3)?,
        author: row.get(4)?,
        year: row.get(5)?,
        title: row.get(6)?,
        publisher: row.get(7)?,
        subject: row.get(8)?,
        purposes: parse_json_array(&row.get::<_, String>(9)?),
        is_qualitative: row.get::<_, i32>(10)? != 0,
        is_quantitative: row.get::<_, i32>(11)? != 0,
        qual_tools: parse_json_array(&row.get::<_, String>(12)?),
        vars_independent: parse_json_array(&row.get::<_, String>(13)?),
        vars_dependent: parse_json_array(&row.get::<_, String>(14)?),
        vars_moderator: parse_json_array(&row.get::<_, String>(15)?),
        vars_mediator: parse_json_array(&row.get::<_, String>(16)?),
        vars_others: parse_json_array(&row.get::<_, String>(17)?),
        quant_techniques: parse_json_array(&row.get::<_, String>(18)?),
        results: parse_json_array(&row.get::<_, String>(19)?),
        limitations: parse_json_array(&row.get::<_, String>(20)?),
        implications: parse_json_array(&row.get::<_, String>(21)?),
        future_plans: parse_json_array(&row.get::<_, String>(22)?),
        pdf_path: row.get(23)?,
        pdf_filename: row.get(24)?,
        user_notes: row.get(25)?,
        tags: parse_json_array(&row.get::<_, String>(26)?),
        is_read: row.get::<_, i32>(27)? != 0,
        importance: row.get(28)?,
        created_at: row.get(29)?,
        updated_at: row.get(30)?,
        last_analyzed_at: row.get(31)?,
    })
}

const SELECT_COLUMNS: &str = r#"
    id, folder_id, paper_number, keywords, author, year, title, publisher, subject,
    purposes, is_qualitative, is_quantitative, qual_tools,
    vars_independent, vars_dependent, vars_moderator, vars_mediator, vars_others, quant_techniques,
    results, limitations, implications, future_plans,
    pdf_path, pdf_filename, user_notes, tags, is_read, importance,
    created_at, updated_at, last_analyzed_at
"#;

pub fn get_papers(
    conn: &Connection,
    folder_id: Option<String>,
    sort_by: Option<String>,
) -> Result<Vec<Paper>, AppError> {
    let order_clause = match sort_by.as_deref() {
        Some("name") => "ORDER BY title ASC",
        _ => "ORDER BY created_at DESC",
    };

    if let Some(fid) = folder_id {
        let query = format!(
            "SELECT {} FROM papers WHERE folder_id = ? {}",
            SELECT_COLUMNS, order_clause
        );
        let mut stmt = conn.prepare(&query)?;
        let papers = stmt
            .query_map([fid], row_to_paper)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(papers)
    } else {
        let query = format!("SELECT {} FROM papers {}", SELECT_COLUMNS, order_clause);
        let mut stmt = conn.prepare(&query)?;
        let papers = stmt
            .query_map([], row_to_paper)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(papers)
    }
}

pub fn get_paper(conn: &Connection, paper_id: &str) -> Result<Paper, AppError> {
    let query = format!("SELECT {} FROM papers WHERE id = ?", SELECT_COLUMNS);
    let mut stmt = conn.prepare(&query)?;

    stmt.query_row([paper_id], row_to_paper)
        .map_err(|_| AppError::NotFound(format!("Paper not found: {}", paper_id)))
}

fn get_next_paper_number(conn: &Connection) -> Result<i32, AppError> {
    let number: i32 = conn.query_row(
        "SELECT next_number FROM paper_sequence WHERE id = 1",
        [],
        |row| row.get(0),
    )?;

    conn.execute(
        "UPDATE paper_sequence SET next_number = next_number + 1 WHERE id = 1",
        [],
    )?;

    Ok(number)
}

pub fn create_paper(conn: &Connection, input: CreatePaperInput) -> Result<Paper, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let paper_number = get_next_paper_number(conn)?;

    conn.execute(
        r#"INSERT INTO papers (
            id, folder_id, paper_number, title, author, year, pdf_path, pdf_filename,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        params![
            id,
            input.folder_id,
            paper_number,
            input.title,
            input.author.unwrap_or_default(),
            input.year.unwrap_or(0),
            input.pdf_path.unwrap_or_default(),
            input.pdf_filename.unwrap_or_default(),
            now,
            now
        ],
    )?;

    get_paper(conn, &id)
}

pub fn update_paper(
    conn: &Connection,
    paper_id: &str,
    input: UpdatePaperInput,
) -> Result<Paper, AppError> {
    let paper = get_paper(conn, paper_id)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        r#"UPDATE papers SET
            folder_id = ?,
            keywords = ?,
            author = ?,
            year = ?,
            title = ?,
            publisher = ?,
            subject = ?,
            purposes = ?,
            is_qualitative = ?,
            is_quantitative = ?,
            qual_tools = ?,
            vars_independent = ?,
            vars_dependent = ?,
            vars_moderator = ?,
            vars_mediator = ?,
            vars_others = ?,
            quant_techniques = ?,
            results = ?,
            limitations = ?,
            implications = ?,
            future_plans = ?,
            pdf_path = ?,
            pdf_filename = ?,
            user_notes = ?,
            tags = ?,
            is_read = ?,
            importance = ?,
            updated_at = ?,
            last_analyzed_at = ?
        WHERE id = ?"#,
        params![
            input.folder_id.unwrap_or(paper.folder_id),
            input.keywords.unwrap_or(paper.keywords),
            input.author.unwrap_or(paper.author),
            input.year.unwrap_or(paper.year),
            input.title.unwrap_or(paper.title),
            input.publisher.unwrap_or(paper.publisher),
            input.subject.unwrap_or(paper.subject),
            to_json_array(&input.purposes.unwrap_or(paper.purposes)),
            input.is_qualitative.unwrap_or(paper.is_qualitative) as i32,
            input.is_quantitative.unwrap_or(paper.is_quantitative) as i32,
            to_json_array(&input.qual_tools.unwrap_or(paper.qual_tools)),
            to_json_array(&input.vars_independent.unwrap_or(paper.vars_independent)),
            to_json_array(&input.vars_dependent.unwrap_or(paper.vars_dependent)),
            to_json_array(&input.vars_moderator.unwrap_or(paper.vars_moderator)),
            to_json_array(&input.vars_mediator.unwrap_or(paper.vars_mediator)),
            to_json_array(&input.vars_others.unwrap_or(paper.vars_others)),
            to_json_array(&input.quant_techniques.unwrap_or(paper.quant_techniques)),
            to_json_array(&input.results.unwrap_or(paper.results)),
            to_json_array(&input.limitations.unwrap_or(paper.limitations)),
            to_json_array(&input.implications.unwrap_or(paper.implications)),
            to_json_array(&input.future_plans.unwrap_or(paper.future_plans)),
            input.pdf_path.unwrap_or(paper.pdf_path),
            input.pdf_filename.unwrap_or(paper.pdf_filename),
            input.user_notes.unwrap_or(paper.user_notes),
            to_json_array(&input.tags.unwrap_or(paper.tags)),
            input.is_read.unwrap_or(paper.is_read) as i32,
            input.importance.unwrap_or(paper.importance),
            now,
            input.last_analyzed_at.or(paper.last_analyzed_at),
            paper_id
        ],
    )?;

    get_paper(conn, paper_id)
}

pub fn delete_paper(conn: &Connection, paper_id: &str) -> Result<(), AppError> {
    get_paper(conn, paper_id)?;
    conn.execute("DELETE FROM papers WHERE id = ?", [paper_id])?;
    Ok(())
}

pub fn check_duplicate(conn: &Connection, title: &str) -> Result<bool, AppError> {
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM papers WHERE title = ?",
        [title],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}
