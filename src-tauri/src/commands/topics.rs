use tauri::{AppHandle, Emitter, State};

use crate::db::DbConnection;
use crate::error::AppError;
use crate::models::{CreateTopicInput, Topic, UpdateTopicInput};

#[tauri::command]
pub fn get_topics(db: State<'_, DbConnection>) -> Result<Vec<Topic>, AppError> {
    let conn = db.get()?;
    crate::db::topics::get_topics(&conn)
}

#[tauri::command]
pub fn get_topic(db: State<'_, DbConnection>, topic_id: String) -> Result<Topic, AppError> {
    let conn = db.get()?;
    crate::db::topics::get_topic(&conn, &topic_id)
}

#[tauri::command]
pub fn create_topic(
    app: AppHandle,
    db: State<'_, DbConnection>,
    input: CreateTopicInput,
) -> Result<Topic, AppError> {
    let conn = db.get()?;
    let topic = crate::db::topics::create_topic(&conn, input)?;
    let _ = app.emit("topics-changed", ());
    Ok(topic)
}

#[tauri::command]
pub fn update_topic(
    app: AppHandle,
    db: State<'_, DbConnection>,
    topic_id: String,
    input: UpdateTopicInput,
) -> Result<Topic, AppError> {
    let conn = db.get()?;
    let topic = crate::db::topics::update_topic(&conn, &topic_id, input)?;
    let _ = app.emit("topics-changed", ());
    Ok(topic)
}

#[tauri::command]
pub fn delete_topic(
    app: AppHandle,
    db: State<'_, DbConnection>,
    topic_id: String,
) -> Result<(), AppError> {
    let conn = db.get()?;
    crate::db::topics::delete_topic(&conn, &topic_id)?;
    let _ = app.emit("topics-changed", ());
    Ok(())
}
