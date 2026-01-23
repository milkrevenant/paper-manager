use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{CreateTopicInput, Topic, UpdateTopicInput};

pub fn get_topics(conn: &Connection) -> Result<Vec<Topic>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, color, icon, sort_order, parent_id, created_at, updated_at 
         FROM topics ORDER BY sort_order ASC",
    )?;

    let topics = stmt
        .query_map([], |row| {
            Ok(Topic {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                parent_id: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(topics)
}

pub fn get_topic(conn: &Connection, topic_id: &str) -> Result<Topic, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, color, icon, sort_order, parent_id, created_at, updated_at 
         FROM topics WHERE id = ?",
    )?;

    stmt.query_row([topic_id], |row| {
        Ok(Topic {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            parent_id: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })
    .map_err(|_| AppError::NotFound(format!("Topic not found: {}", topic_id)))
}

pub fn create_topic(conn: &Connection, input: CreateTopicInput) -> Result<Topic, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let color = input.color.unwrap_or_else(|| "blue".to_string());
    let icon = input.icon.unwrap_or_else(|| "BookOpen".to_string());

    // Get next sort order
    let max_order: i32 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), -1) FROM topics", [], |row| {
            row.get(0)
        })
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO topics (id, name, color, icon, sort_order, parent_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, input.name, color, icon, max_order + 1, input.parent_id, now, now],
    )?;

    get_topic(conn, &id)
}

pub fn update_topic(
    conn: &Connection,
    topic_id: &str,
    input: UpdateTopicInput,
) -> Result<Topic, AppError> {
    let topic = get_topic(conn, topic_id)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let name = input.name.unwrap_or(topic.name);
    let color = input.color.unwrap_or(topic.color);
    let icon = input.icon.unwrap_or(topic.icon);
    let sort_order = input.sort_order.unwrap_or(topic.sort_order);
    let parent_id = if input.parent_id.is_some() {
        input.parent_id
    } else {
        topic.parent_id
    };

    conn.execute(
        "UPDATE topics SET name = ?, color = ?, icon = ?, sort_order = ?, parent_id = ?, updated_at = ? 
         WHERE id = ?",
        params![name, color, icon, sort_order, parent_id, now, topic_id],
    )?;

    get_topic(conn, topic_id)
}

pub fn delete_topic(conn: &Connection, topic_id: &str) -> Result<(), AppError> {
    // Check if topic exists
    get_topic(conn, topic_id)?;

    conn.execute("DELETE FROM topics WHERE id = ?", [topic_id])?;
    Ok(())
}
