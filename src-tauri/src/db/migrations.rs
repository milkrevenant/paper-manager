use rusqlite::Connection;
use crate::error::AppError;

pub fn run(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(
        r#"
        -- Topics table
        CREATE TABLE IF NOT EXISTS topics (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT 'blue',
            icon TEXT NOT NULL DEFAULT 'BookOpen',
            sort_order INTEGER NOT NULL DEFAULT 0,
            parent_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_id);
        CREATE INDEX IF NOT EXISTS idx_topics_order ON topics(sort_order);

        -- Folders table
        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_folders_topic ON folders(topic_id);
        CREATE INDEX IF NOT EXISTS idx_folders_order ON folders(sort_order);

        -- Papers table
        CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY,
            folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
            paper_number INTEGER NOT NULL UNIQUE,
            
            keywords TEXT NOT NULL DEFAULT '',
            author TEXT NOT NULL DEFAULT '',
            year INTEGER NOT NULL DEFAULT 0,
            title TEXT NOT NULL DEFAULT '',
            publisher TEXT NOT NULL DEFAULT '',
            subject TEXT NOT NULL DEFAULT '',
            
            purposes TEXT NOT NULL DEFAULT '[]',
            is_qualitative INTEGER NOT NULL DEFAULT 0,
            is_quantitative INTEGER NOT NULL DEFAULT 0,
            
            qual_tools TEXT NOT NULL DEFAULT '[]',
            
            vars_independent TEXT NOT NULL DEFAULT '[]',
            vars_dependent TEXT NOT NULL DEFAULT '[]',
            vars_moderator TEXT NOT NULL DEFAULT '[]',
            vars_mediator TEXT NOT NULL DEFAULT '[]',
            vars_others TEXT NOT NULL DEFAULT '[]',
            quant_techniques TEXT NOT NULL DEFAULT '[]',
            
            results TEXT NOT NULL DEFAULT '[]',
            limitations TEXT NOT NULL DEFAULT '[]',
            implications TEXT NOT NULL DEFAULT '[]',
            future_plans TEXT NOT NULL DEFAULT '[]',
            
            pdf_path TEXT NOT NULL DEFAULT '',
            pdf_filename TEXT NOT NULL DEFAULT '',
            
            user_notes TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT '[]',
            is_read INTEGER NOT NULL DEFAULT 0,
            importance INTEGER NOT NULL DEFAULT 3,
            
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_analyzed_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_papers_folder ON papers(folder_id);
        CREATE INDEX IF NOT EXISTS idx_papers_title ON papers(title);
        CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
        CREATE INDEX IF NOT EXISTS idx_papers_created ON papers(created_at DESC);

        -- Paper sequence for auto-increment paper numbers
        CREATE TABLE IF NOT EXISTS paper_sequence (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            next_number INTEGER NOT NULL DEFAULT 1
        );
        INSERT OR IGNORE INTO paper_sequence (id, next_number) VALUES (1, 1);

        -- Settings table for app configuration
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )?;

    Ok(())
}
