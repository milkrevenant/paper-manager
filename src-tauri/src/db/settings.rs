use rusqlite::Connection;
use crate::error::AppError;

/// Get a setting value by key
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?")?;
    let result = stmt.query_row([key], |row| row.get::<_, String>(0));

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

/// Set a setting value (insert or update)
pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        r#"
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        "#,
        [key, value],
    )?;
    Ok(())
}

/// Get all settings as a list of (key, value) pairs
pub fn get_all_settings(conn: &Connection) -> Result<Vec<(String, String)>, AppError> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings ORDER BY key")?;
    let settings = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(settings)
}

/// Delete a setting by key
pub fn delete_setting(conn: &Connection, key: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM settings WHERE key = ?", [key])?;
    Ok(())
}
