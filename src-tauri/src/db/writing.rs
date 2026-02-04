use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{
    CreateWritingDocumentInput, CreateWritingProjectInput, MoveWritingDocumentInput,
    UpdateWritingDocumentInput, UpdateWritingProjectInput, WritingDocument, WritingProject,
    WritingProjectMetadata,
};

fn parse_json_array(json: &str) -> Vec<String> {
    serde_json::from_str(json).unwrap_or_default()
}

fn to_json_array(vec: &[String]) -> String {
    serde_json::to_string(vec).unwrap_or_else(|_| "[]".to_string())
}

fn parse_metadata(json: &str) -> WritingProjectMetadata {
    serde_json::from_str(json).unwrap_or_default()
}

fn to_metadata_json(metadata: &WritingProjectMetadata) -> String {
    serde_json::to_string(metadata).unwrap_or_else(|_| "{}".to_string())
}

// ============================================================================
// Writing Project Operations
// ============================================================================

fn row_to_project(row: &rusqlite::Row) -> rusqlite::Result<WritingProject> {
    Ok(WritingProject {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        project_type: row.get(3)?,
        linked_paper_id: row.get(4)?,
        root_document_id: row.get(5)?,
        target_word_count: row.get(6)?,
        status: row.get(7)?,
        metadata: parse_metadata(&row.get::<_, String>(8)?),
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        last_opened_at: row.get(11)?,
    })
}

const PROJECT_SELECT_COLUMNS: &str = r#"
    id, title, description, type, linked_paper_id, root_document_id,
    target_word_count, status, metadata, created_at, updated_at, last_opened_at
"#;

pub fn get_writing_projects(conn: &Connection) -> Result<Vec<WritingProject>, AppError> {
    let query = format!(
        "SELECT {} FROM writing_projects ORDER BY updated_at DESC",
        PROJECT_SELECT_COLUMNS
    );
    let mut stmt = conn.prepare(&query)?;
    let projects = stmt
        .query_map([], row_to_project)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(projects)
}

pub fn get_writing_project(conn: &Connection, project_id: &str) -> Result<WritingProject, AppError> {
    let query = format!(
        "SELECT {} FROM writing_projects WHERE id = ?",
        PROJECT_SELECT_COLUMNS
    );
    let mut stmt = conn.prepare(&query)?;
    stmt.query_row([project_id], row_to_project)
        .map_err(|_| AppError::NotFound(format!("Writing project not found: {}", project_id)))
}

pub fn create_writing_project(
    conn: &Connection,
    input: CreateWritingProjectInput,
) -> Result<WritingProject, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        r#"INSERT INTO writing_projects (
            id, title, description, type, linked_paper_id, target_word_count,
            status, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'draft', '{}', ?, ?)"#,
        params![
            id,
            input.title,
            input.description.unwrap_or_default(),
            input.project_type.unwrap_or_else(|| "standalone".to_string()),
            input.linked_paper_id,
            input.target_word_count,
            now,
            now
        ],
    )?;

    // Create a root document for the project
    let root_doc_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO writing_documents (
            id, project_id, title, content_type, sort_order, created_at, updated_at
        ) VALUES (?, ?, 'Untitled', 'text', 0, ?, ?)"#,
        params![root_doc_id, id, now, now],
    )?;

    // Update project with root document id
    conn.execute(
        "UPDATE writing_projects SET root_document_id = ? WHERE id = ?",
        params![root_doc_id, id],
    )?;

    get_writing_project(conn, &id)
}

pub fn update_writing_project(
    conn: &Connection,
    project_id: &str,
    input: UpdateWritingProjectInput,
) -> Result<WritingProject, AppError> {
    let project = get_writing_project(conn, project_id)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let new_metadata = input.metadata.unwrap_or(project.metadata);

    conn.execute(
        r#"UPDATE writing_projects SET
            title = ?,
            description = ?,
            type = ?,
            linked_paper_id = ?,
            target_word_count = ?,
            status = ?,
            metadata = ?,
            updated_at = ?
        WHERE id = ?"#,
        params![
            input.title.unwrap_or(project.title),
            input.description.unwrap_or(project.description),
            input.project_type.unwrap_or(project.project_type),
            input.linked_paper_id.or(project.linked_paper_id),
            input.target_word_count.or(project.target_word_count),
            input.status.unwrap_or(project.status),
            to_metadata_json(&new_metadata),
            now,
            project_id
        ],
    )?;

    get_writing_project(conn, project_id)
}

pub fn delete_writing_project(conn: &Connection, project_id: &str) -> Result<(), AppError> {
    get_writing_project(conn, project_id)?;
    conn.execute("DELETE FROM writing_projects WHERE id = ?", [project_id])?;
    Ok(())
}

pub fn update_project_last_opened(conn: &Connection, project_id: &str) -> Result<(), AppError> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE writing_projects SET last_opened_at = ? WHERE id = ?",
        params![now, project_id],
    )?;
    Ok(())
}

// ============================================================================
// Writing Document Operations
// ============================================================================

fn row_to_document(row: &rusqlite::Row) -> rusqlite::Result<WritingDocument> {
    Ok(WritingDocument {
        id: row.get(0)?,
        project_id: row.get(1)?,
        parent_id: row.get(2)?,
        title: row.get(3)?,
        content: row.get(4)?,
        content_type: row.get(5)?,
        sort_order: row.get(6)?,
        is_expanded: row.get::<_, i32>(7)? != 0,
        synopsis: row.get(8)?,
        notes: row.get(9)?,
        status: row.get(10)?,
        word_count: row.get(11)?,
        target_word_count: row.get(12)?,
        labels: parse_json_array(&row.get::<_, String>(13)?),
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
    })
}

const DOCUMENT_SELECT_COLUMNS: &str = r#"
    id, project_id, parent_id, title, content, content_type, sort_order,
    is_expanded, synopsis, notes, status, word_count, target_word_count,
    labels, created_at, updated_at
"#;

pub fn get_writing_documents(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<WritingDocument>, AppError> {
    let query = format!(
        "SELECT {} FROM writing_documents WHERE project_id = ? ORDER BY sort_order ASC",
        DOCUMENT_SELECT_COLUMNS
    );
    let mut stmt = conn.prepare(&query)?;
    let documents = stmt
        .query_map([project_id], row_to_document)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(documents)
}

pub fn get_writing_document(
    conn: &Connection,
    document_id: &str,
) -> Result<WritingDocument, AppError> {
    let query = format!(
        "SELECT {} FROM writing_documents WHERE id = ?",
        DOCUMENT_SELECT_COLUMNS
    );
    let mut stmt = conn.prepare(&query)?;
    stmt.query_row([document_id], row_to_document)
        .map_err(|_| AppError::NotFound(format!("Writing document not found: {}", document_id)))
}

pub fn create_writing_document(
    conn: &Connection,
    input: CreateWritingDocumentInput,
) -> Result<WritingDocument, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Get max sort_order for the parent
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM writing_documents WHERE project_id = ? AND parent_id IS ?",
            params![input.project_id, input.parent_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    let sort_order = input.sort_order.unwrap_or(max_order + 1);

    conn.execute(
        r#"INSERT INTO writing_documents (
            id, project_id, parent_id, title, content_type, sort_order,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
        params![
            id,
            input.project_id,
            input.parent_id,
            input.title,
            input.content_type.unwrap_or_else(|| "text".to_string()),
            sort_order,
            now,
            now
        ],
    )?;

    // Update project's updated_at
    conn.execute(
        "UPDATE writing_projects SET updated_at = ? WHERE id = ?",
        params![now, input.project_id],
    )?;

    get_writing_document(conn, &id)
}

pub fn update_writing_document(
    conn: &Connection,
    document_id: &str,
    input: UpdateWritingDocumentInput,
) -> Result<WritingDocument, AppError> {
    let document = get_writing_document(conn, document_id)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        r#"UPDATE writing_documents SET
            title = ?,
            content = ?,
            content_type = ?,
            sort_order = ?,
            is_expanded = ?,
            synopsis = ?,
            notes = ?,
            status = ?,
            word_count = ?,
            target_word_count = ?,
            labels = ?,
            updated_at = ?
        WHERE id = ?"#,
        params![
            input.title.unwrap_or(document.title),
            input.content.unwrap_or(document.content),
            input.content_type.unwrap_or(document.content_type),
            input.sort_order.unwrap_or(document.sort_order),
            input.is_expanded.unwrap_or(document.is_expanded) as i32,
            input.synopsis.unwrap_or(document.synopsis),
            input.notes.unwrap_or(document.notes),
            input.status.unwrap_or(document.status),
            input.word_count.unwrap_or(document.word_count),
            input.target_word_count.or(document.target_word_count),
            to_json_array(&input.labels.unwrap_or(document.labels)),
            now,
            document_id
        ],
    )?;

    // Update project's updated_at
    conn.execute(
        "UPDATE writing_projects SET updated_at = ? WHERE id = ?",
        params![now, document.project_id],
    )?;

    get_writing_document(conn, document_id)
}

pub fn delete_writing_document(conn: &Connection, document_id: &str) -> Result<(), AppError> {
    let document = get_writing_document(conn, document_id)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute("DELETE FROM writing_documents WHERE id = ?", [document_id])?;

    // Update project's updated_at
    conn.execute(
        "UPDATE writing_projects SET updated_at = ? WHERE id = ?",
        params![now, document.project_id],
    )?;

    Ok(())
}

pub fn move_writing_document(
    conn: &Connection,
    document_id: &str,
    input: MoveWritingDocumentInput,
) -> Result<WritingDocument, AppError> {
    let document = get_writing_document(conn, document_id)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "UPDATE writing_documents SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ?",
        params![input.parent_id, input.sort_order, now, document_id],
    )?;

    // Update project's updated_at
    conn.execute(
        "UPDATE writing_projects SET updated_at = ? WHERE id = ?",
        params![now, document.project_id],
    )?;

    get_writing_document(conn, document_id)
}

// ============================================================================
// Export Operations
// ============================================================================

pub fn export_project_markdown(
    conn: &Connection,
    project_id: &str,
) -> Result<String, AppError> {
    let project = get_writing_project(conn, project_id)?;
    let documents = get_writing_documents(conn, project_id)?;

    let mut markdown = format!("# {}\n\n", project.title);
    if !project.description.is_empty() {
        markdown.push_str(&format!("{}\n\n", project.description));
    }

    // Build tree structure and render
    fn render_document(doc: &WritingDocument, documents: &[WritingDocument], level: usize) -> String {
        let mut output = String::new();

        if doc.content_type == "text" {
            // Add heading based on level
            let heading = "#".repeat(level.min(6));
            output.push_str(&format!("{} {}\n\n", heading, doc.title));

            if !doc.content.is_empty() {
                // Content is stored as TipTap JSON, for now just include raw
                // In production, you'd convert TipTap JSON to markdown
                output.push_str(&format!("{}\n\n", doc.content));
            }
        }

        // Render children
        let children: Vec<_> = documents
            .iter()
            .filter(|d| d.parent_id.as_ref() == Some(&doc.id))
            .collect();

        for child in children {
            output.push_str(&render_document(child, documents, level + 1));
        }

        output
    }

    // Find root-level documents
    let root_docs: Vec<_> = documents
        .iter()
        .filter(|d| d.parent_id.is_none())
        .collect();

    for doc in root_docs {
        markdown.push_str(&render_document(doc, &documents, 2));
    }

    Ok(markdown)
}
