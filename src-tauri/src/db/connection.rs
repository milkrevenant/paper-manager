use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

use crate::error::AppError;

pub struct DbConnection {
    conn: Mutex<Connection>,
}

impl DbConnection {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, AppError> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn get(&self) -> Result<std::sync::MutexGuard<'_, Connection>, AppError> {
        self.conn
            .lock()
            .map_err(|e| AppError::Database(format!("Failed to acquire lock: {}", e)))
    }
}
