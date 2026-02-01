use rusqlite::Connection;
use crate::error::AppError;

pub fn run(conn: &Connection) -> Result<(), AppError> {
    // Main schema
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

        -- Create default topic and folder
        INSERT OR IGNORE INTO topics (id, name, color, icon, sort_order)
        VALUES ('default', 'General', 'gray', 'BookOpen', 0);

        INSERT OR IGNORE INTO folders (id, topic_id, name, sort_order)
        VALUES ('default', 'default', 'Unsorted', 0);

        -- Settings table for app configuration
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Highlights table for PDF annotations
        CREATE TABLE IF NOT EXISTS highlights (
            id TEXT PRIMARY KEY,
            paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
            page_number INTEGER NOT NULL,
            rects TEXT NOT NULL DEFAULT '[]',
            selected_text TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT '#FFFF00',
            note TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_highlights_paper ON highlights(paper_id);
        CREATE INDEX IF NOT EXISTS idx_highlights_page ON highlights(paper_id, page_number);

        -- PDF pages table for full-text search content
        CREATE TABLE IF NOT EXISTS pdf_pages (
            id TEXT PRIMARY KEY,
            paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
            page_number INTEGER NOT NULL,
            text_content TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(paper_id, page_number)
        );

        CREATE INDEX IF NOT EXISTS idx_pdf_pages_paper ON pdf_pages(paper_id);

        -- FTS5 virtual table for full-text search
        CREATE VIRTUAL TABLE IF NOT EXISTS pdf_pages_fts USING fts5(
            text_content,
            content='pdf_pages',
            content_rowid='rowid',
            tokenize='unicode61 remove_diacritics 2'
        );

        -- Triggers to keep FTS in sync
        CREATE TRIGGER IF NOT EXISTS pdf_pages_ai AFTER INSERT ON pdf_pages BEGIN
            INSERT INTO pdf_pages_fts(rowid, text_content) VALUES (new.rowid, new.text_content);
        END;

        CREATE TRIGGER IF NOT EXISTS pdf_pages_ad AFTER DELETE ON pdf_pages BEGIN
            INSERT INTO pdf_pages_fts(pdf_pages_fts, rowid, text_content) VALUES('delete', old.rowid, old.text_content);
        END;

        CREATE TRIGGER IF NOT EXISTS pdf_pages_au AFTER UPDATE ON pdf_pages BEGIN
            INSERT INTO pdf_pages_fts(pdf_pages_fts, rowid, text_content) VALUES('delete', old.rowid, old.text_content);
            INSERT INTO pdf_pages_fts(rowid, text_content) VALUES (new.rowid, new.text_content);
        END;

        -- Smart groups table for custom paper groupings
        CREATE TABLE IF NOT EXISTS smart_groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            criteria TEXT NOT NULL DEFAULT '[]',
            match_mode TEXT NOT NULL DEFAULT 'and',
            icon TEXT,
            color TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_smart_groups_name ON smart_groups(name);

        -- Watch folders table for auto-import
        CREATE TABLE IF NOT EXISTS watch_folders (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            target_folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
            auto_analyze INTEGER NOT NULL DEFAULT 0,
            auto_rename INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_watch_folders_path ON watch_folders(path);
        CREATE INDEX IF NOT EXISTS idx_watch_folders_active ON watch_folders(is_active);
        "#,
    )?;

    // Add indexing columns to papers table if they don't exist
    let has_is_indexed: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('papers') WHERE name='is_indexed'",
            [],
            |row| row.get::<_, i32>(0),
        )
        .map(|count| count > 0)
        .unwrap_or(false);

    if !has_is_indexed {
        conn.execute_batch(
            r#"
            ALTER TABLE papers ADD COLUMN is_indexed INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE papers ADD COLUMN indexed_at TEXT;
            "#,
        )?;
    }

    Ok(())
}
