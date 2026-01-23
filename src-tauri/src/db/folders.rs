use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{CreateFolderInput, Folder, UpdateFolderInput};

pub fn get_folders(conn: &Connection, topic_id: &str) -> Result<Vec<Folder>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, topic_id, name, sort_order, created_at, updated_at 
         FROM folders WHERE topic_id = ? ORDER BY sort_order ASC",
    )?;

    let folders = stmt
        .query_map([topic_id], |row| {
            Ok(Folder {
                id: row.get(0)?,
                topic_id: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(folders)
}

pub fn get_all_folders(conn: &Connection) -> Result<Vec<Folder>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, topic_id, name, sort_order, created_at, updated_at 
         FROM folders ORDER BY sort_order ASC",
    )?;

    let folders = stmt
        .query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                topic_id: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(folders)
}

pub fn get_folder(conn: &Connection, folder_id: &str) -> Result<Folder, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, topic_id, name, sort_order, created_at, updated_at 
         FROM folders WHERE id = ?",
    )?;

    stmt.query_row([folder_id], |row| {
        Ok(Folder {
            id: row.get(0)?,
            topic_id: row.get(1)?,
            name: row.get(2)?,
            sort_order: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })
    .map_err(|_| AppError::NotFound(format!("Folder not found: {}", folder_id)))
}

pub fn create_folder(conn: &Connection, input: CreateFolderInput) -> Result<Folder, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Get next sort order for this topic
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM folders WHERE topic_id = ?",
            [&input.topic_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO folders (id, topic_id, name, sort_order, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)",
        params![id, input.topic_id, input.name, max_order + 1, now, now],
    )?;

    get_folder(conn, &id)
}

pub fn update_folder(
    conn: &Connection,
    folder_id: &str,
    input: UpdateFolderInput,
) -> Result<Folder, AppError> {
    let folder = get_folder(conn, folder_id)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let name = input.name.unwrap_or(folder.name);
    let sort_order = input.sort_order.unwrap_or(folder.sort_order);

    conn.execute(
        "UPDATE folders SET name = ?, sort_order = ?, updated_at = ? WHERE id = ?",
        params![name, sort_order, now, folder_id],
    )?;

    get_folder(conn, folder_id)
}

pub fn delete_folder(conn: &Connection, folder_id: &str) -> Result<(), AppError> {
    // Check if folder exists
    get_folder(conn, folder_id)?;

    conn.execute("DELETE FROM folders WHERE id = ?", [folder_id])?;
    Ok(())
}
