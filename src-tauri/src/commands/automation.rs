//! Automation module for Paper Manager
//!
//! This module provides automation features:
//! - Smart Groups: Auto-grouping papers by various criteria
//! - Watch Folder: Monitor folders for new PDFs and auto-import
//! - PDF Auto-Rename: Rename PDFs based on paper metadata

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::db::DbConnection;
use crate::error::AppError;
use crate::models::Paper;

// ============================================================================
// Smart Groups Types
// ============================================================================

/// Criteria for smart grouping of papers
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "camelCase")]
pub enum SmartGroupCriteria {
    /// Group by publication year
    ByYear(i32),
    /// Group by year range (inclusive)
    ByYearRange { start: i32, end: i32 },
    /// Group by author (partial match)
    ByAuthor(String),
    /// Group by keyword (partial match in keywords field)
    ByKeyword(String),
    /// Group by tag
    ByTag(String),
    /// Group by read status
    ByReadStatus(bool),
    /// Group by importance level (1-5)
    ByImportance(i32),
    /// Group by research type
    ByResearchType { qualitative: bool, quantitative: bool },
    /// Group by recently added (within last N days)
    RecentlyAdded(i32),
    /// Group by recently analyzed
    RecentlyAnalyzed(i32),
    /// Group by publisher
    ByPublisher(String),
    /// Group by subject
    BySubject(String),
    /// Papers with no PDF attached
    NoPdf,
    /// Papers with PDF attached
    HasPdf,
    /// Unread papers
    Unread,
    /// Favorite papers (importance >= 4)
    Favorites,
}

/// A smart group definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmartGroup {
    pub id: String,
    pub name: String,
    pub criteria: Vec<SmartGroupCriteria>,
    /// How to combine criteria: "and" or "or"
    pub match_mode: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
}

/// Result of smart group query (exported for potential future use)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct SmartGroupResult {
    pub group: SmartGroup,
    pub papers: Vec<Paper>,
    pub count: usize,
}

/// Input for creating a smart group
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSmartGroupInput {
    pub name: String,
    pub criteria: Vec<SmartGroupCriteria>,
    #[serde(default = "default_match_mode")]
    pub match_mode: String,
    pub icon: Option<String>,
    pub color: Option<String>,
}

fn default_match_mode() -> String {
    "and".to_string()
}

// ============================================================================
// Watch Folder Types
// ============================================================================

/// Watch folder configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchFolder {
    pub id: String,
    pub path: String,
    pub target_folder_id: String,
    pub auto_analyze: bool,
    pub auto_rename: bool,
    pub is_active: bool,
    pub created_at: String,
}

/// Input for creating a watch folder
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWatchFolderInput {
    pub path: String,
    pub target_folder_id: String,
    #[serde(default)]
    pub auto_analyze: bool,
    #[serde(default)]
    pub auto_rename: bool,
}

/// Event emitted when a file is detected in a watch folder
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchFolderEvent {
    pub watch_folder_id: String,
    pub file_path: String,
    pub file_name: String,
    pub event_type: String,
}

/// State for managing watch folder watchers
pub struct WatchFolderState {
    /// Map of watch folder ID to active watcher handle
    pub watchers: Mutex<HashMap<String, WatcherHandle>>,
}

/// Handle to control a file watcher
pub struct WatcherHandle {
    /// Channel to signal the watcher to stop
    pub stop_tx: std::sync::mpsc::Sender<()>,
}

impl Default for WatchFolderState {
    fn default() -> Self {
        Self {
            watchers: Mutex::new(HashMap::new()),
        }
    }
}

// ============================================================================
// PDF Auto-Rename Types
// ============================================================================

/// Configuration for PDF auto-rename
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameConfig {
    /// Pattern for renaming: {author}, {year}, {title}
    pub pattern: String,
    /// Maximum length for title in filename
    #[serde(default = "default_max_title_length")]
    pub max_title_length: usize,
    /// Replace spaces with this character
    #[serde(default = "default_space_replacement")]
    pub space_replacement: String,
    /// Whether to lowercase the filename
    #[serde(default)]
    pub lowercase: bool,
}

fn default_max_title_length() -> usize {
    50
}

fn default_space_replacement() -> String {
    "_".to_string()
}

impl Default for RenameConfig {
    fn default() -> Self {
        Self {
            pattern: "{author}_{year}_{title}".to_string(),
            max_title_length: 50,
            space_replacement: "_".to_string(),
            lowercase: false,
        }
    }
}

/// Result of a rename operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameResult {
    pub paper_id: String,
    pub old_path: String,
    pub new_path: String,
    pub old_filename: String,
    pub new_filename: String,
    pub success: bool,
    pub error: Option<String>,
}

// ============================================================================
// Smart Groups Commands
// ============================================================================

/// Get papers matching smart group criteria
#[tauri::command]
pub fn get_smart_group_papers(
    db: State<'_, DbConnection>,
    criteria: Vec<SmartGroupCriteria>,
    match_mode: Option<String>,
) -> Result<Vec<Paper>, AppError> {
    let conn = db.get()?;
    let mode = match_mode.unwrap_or_else(|| "and".to_string());

    // Get all papers first
    let all_papers = crate::db::papers::get_papers(&conn, None, None)?;

    if criteria.is_empty() {
        return Ok(all_papers);
    }

    // Filter papers based on criteria
    let filtered: Vec<Paper> = all_papers
        .into_iter()
        .filter(|paper| {
            let matches: Vec<bool> = criteria
                .iter()
                .map(|c| matches_criteria(paper, c))
                .collect();

            if mode == "or" {
                matches.iter().any(|&m| m)
            } else {
                matches.iter().all(|&m| m)
            }
        })
        .collect();

    Ok(filtered)
}

/// Check if a paper matches a single criterion
fn matches_criteria(paper: &Paper, criteria: &SmartGroupCriteria) -> bool {
    match criteria {
        SmartGroupCriteria::ByYear(year) => paper.year == *year,

        SmartGroupCriteria::ByYearRange { start, end } => {
            paper.year >= *start && paper.year <= *end
        }

        SmartGroupCriteria::ByAuthor(author) => {
            paper.author.to_lowercase().contains(&author.to_lowercase())
        }

        SmartGroupCriteria::ByKeyword(keyword) => {
            paper.keywords.to_lowercase().contains(&keyword.to_lowercase())
        }

        SmartGroupCriteria::ByTag(tag) => {
            paper.tags.iter().any(|t| t.to_lowercase() == tag.to_lowercase())
        }

        SmartGroupCriteria::ByReadStatus(is_read) => paper.is_read == *is_read,

        SmartGroupCriteria::ByImportance(importance) => paper.importance == *importance,

        SmartGroupCriteria::ByResearchType { qualitative, quantitative } => {
            paper.is_qualitative == *qualitative && paper.is_quantitative == *quantitative
        }

        SmartGroupCriteria::RecentlyAdded(days) => {
            if let Ok(created) = chrono::NaiveDateTime::parse_from_str(
                &paper.created_at,
                "%Y-%m-%d %H:%M:%S",
            ) {
                let now = chrono::Utc::now().naive_utc();
                let diff = now.signed_duration_since(created);
                diff.num_days() <= *days as i64
            } else {
                false
            }
        }

        SmartGroupCriteria::RecentlyAnalyzed(days) => {
            if let Some(ref analyzed_at) = paper.last_analyzed_at {
                if let Ok(analyzed) = chrono::NaiveDateTime::parse_from_str(
                    analyzed_at,
                    "%Y-%m-%d %H:%M:%S",
                ) {
                    let now = chrono::Utc::now().naive_utc();
                    let diff = now.signed_duration_since(analyzed);
                    diff.num_days() <= *days as i64
                } else {
                    false
                }
            } else {
                false
            }
        }

        SmartGroupCriteria::ByPublisher(publisher) => {
            paper.publisher.to_lowercase().contains(&publisher.to_lowercase())
        }

        SmartGroupCriteria::BySubject(subject) => {
            paper.subject.to_lowercase().contains(&subject.to_lowercase())
        }

        SmartGroupCriteria::NoPdf => paper.pdf_path.is_empty(),

        SmartGroupCriteria::HasPdf => !paper.pdf_path.is_empty(),

        SmartGroupCriteria::Unread => !paper.is_read,

        SmartGroupCriteria::Favorites => paper.importance >= 4,
    }
}

/// Get predefined smart groups
#[tauri::command]
pub fn get_predefined_smart_groups() -> Vec<SmartGroup> {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let current_year = chrono::Utc::now().format("%Y").to_string().parse::<i32>().unwrap_or(2024);

    vec![
        SmartGroup {
            id: "unread".to_string(),
            name: "Unread Papers".to_string(),
            criteria: vec![SmartGroupCriteria::Unread],
            match_mode: "and".to_string(),
            icon: Some("book-open".to_string()),
            color: Some("#3b82f6".to_string()),
            created_at: now.clone(),
        },
        SmartGroup {
            id: "favorites".to_string(),
            name: "Favorites".to_string(),
            criteria: vec![SmartGroupCriteria::Favorites],
            match_mode: "and".to_string(),
            icon: Some("star".to_string()),
            color: Some("#eab308".to_string()),
            created_at: now.clone(),
        },
        SmartGroup {
            id: "recent-week".to_string(),
            name: "Added This Week".to_string(),
            criteria: vec![SmartGroupCriteria::RecentlyAdded(7)],
            match_mode: "and".to_string(),
            icon: Some("clock".to_string()),
            color: Some("#22c55e".to_string()),
            created_at: now.clone(),
        },
        SmartGroup {
            id: "recent-month".to_string(),
            name: "Added This Month".to_string(),
            criteria: vec![SmartGroupCriteria::RecentlyAdded(30)],
            match_mode: "and".to_string(),
            icon: Some("calendar".to_string()),
            color: Some("#06b6d4".to_string()),
            created_at: now.clone(),
        },
        SmartGroup {
            id: "this-year".to_string(),
            name: format!("Published in {}", current_year),
            criteria: vec![SmartGroupCriteria::ByYear(current_year)],
            match_mode: "and".to_string(),
            icon: Some("calendar-days".to_string()),
            color: Some("#8b5cf6".to_string()),
            created_at: now.clone(),
        },
        SmartGroup {
            id: "no-pdf".to_string(),
            name: "Missing PDFs".to_string(),
            criteria: vec![SmartGroupCriteria::NoPdf],
            match_mode: "and".to_string(),
            icon: Some("file-x".to_string()),
            color: Some("#ef4444".to_string()),
            created_at: now.clone(),
        },
        SmartGroup {
            id: "qualitative".to_string(),
            name: "Qualitative Research".to_string(),
            criteria: vec![SmartGroupCriteria::ByResearchType { qualitative: true, quantitative: false }],
            match_mode: "and".to_string(),
            icon: Some("message-square".to_string()),
            color: Some("#f97316".to_string()),
            created_at: now.clone(),
        },
        SmartGroup {
            id: "quantitative".to_string(),
            name: "Quantitative Research".to_string(),
            criteria: vec![SmartGroupCriteria::ByResearchType { qualitative: false, quantitative: true }],
            match_mode: "and".to_string(),
            icon: Some("bar-chart".to_string()),
            color: Some("#14b8a6".to_string()),
            created_at: now.clone(),
        },
        SmartGroup {
            id: "mixed-methods".to_string(),
            name: "Mixed Methods".to_string(),
            criteria: vec![SmartGroupCriteria::ByResearchType { qualitative: true, quantitative: true }],
            match_mode: "and".to_string(),
            icon: Some("git-merge".to_string()),
            color: Some("#ec4899".to_string()),
            created_at: now,
        },
    ]
}

/// Save a custom smart group
#[tauri::command]
pub fn create_smart_group(
    db: State<'_, DbConnection>,
    input: CreateSmartGroupInput,
) -> Result<SmartGroup, AppError> {
    let conn = db.get()?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let criteria_json = serde_json::to_string(&input.criteria)
        .map_err(|e| AppError::Validation(e.to_string()))?;

    conn.execute(
        r#"INSERT INTO smart_groups (id, name, criteria, match_mode, icon, color, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)"#,
        rusqlite::params![
            id,
            input.name,
            criteria_json,
            input.match_mode,
            input.icon,
            input.color,
            now
        ],
    )?;

    Ok(SmartGroup {
        id,
        name: input.name,
        criteria: input.criteria,
        match_mode: input.match_mode,
        icon: input.icon,
        color: input.color,
        created_at: now,
    })
}

/// Get all custom smart groups
#[tauri::command]
pub fn get_smart_groups(db: State<'_, DbConnection>) -> Result<Vec<SmartGroup>, AppError> {
    let conn = db.get()?;

    let mut stmt = conn.prepare(
        "SELECT id, name, criteria, match_mode, icon, color, created_at FROM smart_groups ORDER BY name",
    )?;

    let groups = stmt
        .query_map([], |row| {
            let criteria_json: String = row.get(2)?;
            let criteria: Vec<SmartGroupCriteria> = serde_json::from_str(&criteria_json)
                .unwrap_or_default();

            Ok(SmartGroup {
                id: row.get(0)?,
                name: row.get(1)?,
                criteria,
                match_mode: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(groups)
}

/// Delete a custom smart group
#[tauri::command]
pub fn delete_smart_group(db: State<'_, DbConnection>, group_id: String) -> Result<(), AppError> {
    let conn = db.get()?;
    conn.execute("DELETE FROM smart_groups WHERE id = ?", [&group_id])?;
    Ok(())
}

// ============================================================================
// Watch Folder Commands
// ============================================================================

/// Create a new watch folder
#[tauri::command]
pub fn create_watch_folder(
    db: State<'_, DbConnection>,
    input: CreateWatchFolderInput,
) -> Result<WatchFolder, AppError> {
    let conn = db.get()?;

    // Validate path exists
    let path = PathBuf::from(&input.path);
    if !path.exists() || !path.is_dir() {
        return Err(AppError::Validation(format!(
            "Path does not exist or is not a directory: {}",
            input.path
        )));
    }

    // Check if folder is already being watched
    let existing: i32 = conn.query_row(
        "SELECT COUNT(*) FROM watch_folders WHERE path = ?",
        [&input.path],
        |row| row.get(0),
    )?;

    if existing > 0 {
        return Err(AppError::Validation(format!(
            "Folder is already being watched: {}",
            input.path
        )));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        r#"INSERT INTO watch_folders (id, path, target_folder_id, auto_analyze, auto_rename, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)"#,
        rusqlite::params![
            id,
            input.path,
            input.target_folder_id,
            input.auto_analyze as i32,
            input.auto_rename as i32,
            1, // is_active = true by default
            now
        ],
    )?;

    Ok(WatchFolder {
        id,
        path: input.path,
        target_folder_id: input.target_folder_id,
        auto_analyze: input.auto_analyze,
        auto_rename: input.auto_rename,
        is_active: true,
        created_at: now,
    })
}

/// Get all watch folders
#[tauri::command]
pub fn get_watch_folders(db: State<'_, DbConnection>) -> Result<Vec<WatchFolder>, AppError> {
    let conn = db.get()?;

    let mut stmt = conn.prepare(
        "SELECT id, path, target_folder_id, auto_analyze, auto_rename, is_active, created_at FROM watch_folders ORDER BY created_at DESC",
    )?;

    let folders = stmt
        .query_map([], |row| {
            Ok(WatchFolder {
                id: row.get(0)?,
                path: row.get(1)?,
                target_folder_id: row.get(2)?,
                auto_analyze: row.get::<_, i32>(3)? != 0,
                auto_rename: row.get::<_, i32>(4)? != 0,
                is_active: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(folders)
}

/// Delete a watch folder
#[tauri::command]
pub fn delete_watch_folder(
    db: State<'_, DbConnection>,
    watch_folder_state: State<'_, WatchFolderState>,
    watch_folder_id: String,
) -> Result<(), AppError> {
    // Stop the watcher if running
    if let Ok(mut watchers) = watch_folder_state.watchers.lock() {
        if let Some(handle) = watchers.remove(&watch_folder_id) {
            let _ = handle.stop_tx.send(());
        }
    }

    let conn = db.get()?;
    conn.execute("DELETE FROM watch_folders WHERE id = ?", [&watch_folder_id])?;
    Ok(())
}

/// Toggle watch folder active status
#[tauri::command]
pub fn toggle_watch_folder(
    db: State<'_, DbConnection>,
    watch_folder_id: String,
    is_active: bool,
) -> Result<WatchFolder, AppError> {
    let conn = db.get()?;

    conn.execute(
        "UPDATE watch_folders SET is_active = ? WHERE id = ?",
        rusqlite::params![is_active as i32, watch_folder_id],
    )?;

    let mut stmt = conn.prepare(
        "SELECT id, path, target_folder_id, auto_analyze, auto_rename, is_active, created_at FROM watch_folders WHERE id = ?",
    )?;

    stmt.query_row([&watch_folder_id], |row| {
        Ok(WatchFolder {
            id: row.get(0)?,
            path: row.get(1)?,
            target_folder_id: row.get(2)?,
            auto_analyze: row.get::<_, i32>(3)? != 0,
            auto_rename: row.get::<_, i32>(4)? != 0,
            is_active: row.get::<_, i32>(5)? != 0,
            created_at: row.get(6)?,
        })
    })
    .map_err(|_| AppError::NotFound(format!("Watch folder not found: {}", watch_folder_id)))
}

/// Start watching a folder for new PDFs
#[tauri::command]
pub async fn start_watching(
    app: AppHandle,
    db: State<'_, DbConnection>,
    watch_folder_state: State<'_, WatchFolderState>,
    watch_folder_id: String,
) -> Result<(), AppError> {
    let conn = db.get()?;

    // Get watch folder config
    let watch_folder: WatchFolder = {
        let mut stmt = conn.prepare(
            "SELECT id, path, target_folder_id, auto_analyze, auto_rename, is_active, created_at FROM watch_folders WHERE id = ?",
        )?;

        stmt.query_row([&watch_folder_id], |row| {
            Ok(WatchFolder {
                id: row.get(0)?,
                path: row.get(1)?,
                target_folder_id: row.get(2)?,
                auto_analyze: row.get::<_, i32>(3)? != 0,
                auto_rename: row.get::<_, i32>(4)? != 0,
                is_active: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        })
        .map_err(|_| AppError::NotFound(format!("Watch folder not found: {}", watch_folder_id)))?
    };

    if !watch_folder.is_active {
        return Err(AppError::Validation("Watch folder is not active".to_string()));
    }

    let path = PathBuf::from(&watch_folder.path);
    if !path.exists() {
        return Err(AppError::Validation(format!(
            "Watch folder path does not exist: {}",
            watch_folder.path
        )));
    }

    // Create channel to stop the watcher
    let (stop_tx, stop_rx) = std::sync::mpsc::channel::<()>();

    // Store the watcher handle
    if let Ok(mut watchers) = watch_folder_state.watchers.lock() {
        // Stop existing watcher if any
        if let Some(old_handle) = watchers.remove(&watch_folder_id) {
            let _ = old_handle.stop_tx.send(());
        }
        watchers.insert(watch_folder_id.clone(), WatcherHandle { stop_tx });
    }

    // Spawn watcher thread
    let app_handle = app.clone();
    let watch_path = watch_folder.path.clone();
    let wf_id = watch_folder_id.clone();

    std::thread::spawn(move || {
        use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};

        let (tx, rx) = std::sync::mpsc::channel();

        let mut watcher = match RecommendedWatcher::new(
            move |res: Result<notify::Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        ) {
            Ok(w) => w,
            Err(e) => {
                log::error!("Failed to create watcher: {}", e);
                return;
            }
        };

        if let Err(e) = watcher.watch(std::path::Path::new(&watch_path), RecursiveMode::NonRecursive) {
            log::error!("Failed to watch path: {}", e);
            return;
        }

        log::info!("Started watching folder: {}", watch_path);

        loop {
            // Check for stop signal
            if stop_rx.try_recv().is_ok() {
                log::info!("Stopping watcher for: {}", watch_path);
                break;
            }

            // Check for file events with timeout
            match rx.recv_timeout(std::time::Duration::from_millis(500)) {
                Ok(event) => {
                    if matches!(
                        event.kind,
                        notify::EventKind::Create(_) | notify::EventKind::Modify(notify::event::ModifyKind::Name(_))
                    ) {
                        for path in event.paths {
                            if let Some(ext) = path.extension() {
                                if ext.to_string_lossy().to_lowercase() == "pdf" {
                                    let file_name = path
                                        .file_name()
                                        .map(|n| n.to_string_lossy().to_string())
                                        .unwrap_or_default();

                                    let event = WatchFolderEvent {
                                        watch_folder_id: wf_id.clone(),
                                        file_path: path.to_string_lossy().to_string(),
                                        file_name,
                                        event_type: "created".to_string(),
                                    };

                                    let _ = app_handle.emit("watch-folder-event", &event);
                                    log::info!("New PDF detected: {:?}", path);
                                }
                            }
                        }
                    }
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => continue,
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });

    Ok(())
}

/// Stop watching a folder
#[tauri::command]
pub fn stop_watching(
    watch_folder_state: State<'_, WatchFolderState>,
    watch_folder_id: String,
) -> Result<(), AppError> {
    if let Ok(mut watchers) = watch_folder_state.watchers.lock() {
        if let Some(handle) = watchers.remove(&watch_folder_id) {
            let _ = handle.stop_tx.send(());
            log::info!("Stopped watcher for folder: {}", watch_folder_id);
        }
    }
    Ok(())
}

/// Scan a watch folder for existing PDFs
#[tauri::command]
pub fn scan_watch_folder(
    db: State<'_, DbConnection>,
    watch_folder_id: String,
) -> Result<Vec<String>, AppError> {
    let conn = db.get()?;

    // Get watch folder
    let path: String = conn.query_row(
        "SELECT path FROM watch_folders WHERE id = ?",
        [&watch_folder_id],
        |row| row.get(0),
    ).map_err(|_| AppError::NotFound(format!("Watch folder not found: {}", watch_folder_id)))?;

    let path = PathBuf::from(&path);
    if !path.exists() {
        return Err(AppError::Validation(format!(
            "Watch folder path does not exist: {}",
            path.display()
        )));
    }

    let mut pdfs = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_file() {
                if let Some(ext) = entry_path.extension() {
                    if ext.to_string_lossy().to_lowercase() == "pdf" {
                        pdfs.push(entry_path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    Ok(pdfs)
}

/// Import a PDF from a watch folder
#[tauri::command]
pub fn import_from_watch_folder(
    app: AppHandle,
    db: State<'_, DbConnection>,
    watch_folder_id: String,
    file_path: String,
) -> Result<Paper, AppError> {
    let conn = db.get()?;

    // Get watch folder config
    let (target_folder_id, auto_analyze, _auto_rename): (String, bool, bool) = conn.query_row(
        "SELECT target_folder_id, auto_analyze, auto_rename FROM watch_folders WHERE id = ?",
        [&watch_folder_id],
        |row| Ok((row.get(0)?, row.get::<_, i32>(1)? != 0, row.get::<_, i32>(2)? != 0)),
    ).map_err(|_| AppError::NotFound(format!("Watch folder not found: {}", watch_folder_id)))?;

    let source_path = PathBuf::from(&file_path);
    let file_name = source_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "paper.pdf".to_string());

    // Extract title from filename (remove .pdf extension)
    let title = source_path
        .file_stem()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled".to_string());

    // Create paper entry
    let input = crate::models::CreatePaperInput {
        folder_id: target_folder_id.clone(),
        title,
        author: None,
        year: None,
        pdf_path: None,
        pdf_filename: Some(file_name.clone()),
    };

    let paper = crate::db::papers::create_paper(&conn, input)?;

    // Import the PDF file
    let pdf_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))?
        .join("pdfs");

    if !pdf_dir.exists() {
        std::fs::create_dir_all(&pdf_dir)?;
    }

    let dest_filename = format!("{}_{}", paper.id, file_name);
    let dest_path = pdf_dir.join(&dest_filename);

    std::fs::copy(&source_path, &dest_path)?;

    // Update paper with PDF path
    let update_input = crate::models::UpdatePaperInput {
        pdf_path: Some(dest_path.to_string_lossy().to_string()),
        pdf_filename: Some(file_name),
        ..Default::default()
    };

    let paper = crate::db::papers::update_paper(&conn, &paper.id, update_input)?;

    // Emit event
    let _ = app.emit("papers-changed", &target_folder_id);

    // If auto_analyze is enabled, emit an event to trigger analysis
    if auto_analyze {
        let _ = app.emit("auto-analyze-paper", &paper.id);
    }

    Ok(paper)
}

// ============================================================================
// PDF Auto-Rename Commands
// ============================================================================

/// Generate a new filename for a paper based on its metadata
#[tauri::command]
pub fn generate_paper_filename(
    db: State<'_, DbConnection>,
    paper_id: String,
    config: Option<RenameConfig>,
) -> Result<String, AppError> {
    let conn = db.get()?;
    let paper = crate::db::papers::get_paper(&conn, &paper_id)?;

    let config = config.unwrap_or_default();

    let filename = generate_filename_from_paper(&paper, &config);

    Ok(filename)
}

/// Generate filename from paper metadata
fn generate_filename_from_paper(paper: &Paper, config: &RenameConfig) -> String {
    let mut filename = config.pattern.clone();

    // Replace author placeholder
    let author = if paper.author.is_empty() {
        "Unknown".to_string()
    } else {
        // Get first author's last name
        let author = paper.author.split(',').next().unwrap_or(&paper.author);
        let author = author.split(" and ").next().unwrap_or(author);
        let author = author.split(';').next().unwrap_or(author);
        author.trim().to_string()
    };
    filename = filename.replace("{author}", &sanitize_filename_part(&author, &config.space_replacement));

    // Replace year placeholder
    let year = if paper.year > 0 {
        paper.year.to_string()
    } else {
        "0000".to_string()
    };
    filename = filename.replace("{year}", &year);

    // Replace title placeholder
    let mut title = paper.title.clone();
    if title.len() > config.max_title_length {
        title = title.chars().take(config.max_title_length).collect();
        // Try to cut at a word boundary
        if let Some(last_space) = title.rfind(' ') {
            if last_space > config.max_title_length / 2 {
                title = title.chars().take(last_space).collect();
            }
        }
    }
    filename = filename.replace("{title}", &sanitize_filename_part(&title, &config.space_replacement));

    // Replace keywords placeholder if present
    let keywords = if paper.keywords.is_empty() {
        "".to_string()
    } else {
        paper.keywords.split(',').next().unwrap_or("").trim().to_string()
    };
    filename = filename.replace("{keywords}", &sanitize_filename_part(&keywords, &config.space_replacement));

    // Replace publisher placeholder if present
    filename = filename.replace("{publisher}", &sanitize_filename_part(&paper.publisher, &config.space_replacement));

    // Apply lowercase if configured
    if config.lowercase {
        filename = filename.to_lowercase();
    }

    // Ensure .pdf extension
    if !filename.to_lowercase().ends_with(".pdf") {
        filename.push_str(".pdf");
    }

    filename
}

/// Sanitize a string for use in a filename
fn sanitize_filename_part(s: &str, space_replacement: &str) -> String {
    s.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else if c.is_whitespace() {
                space_replacement.chars().next().unwrap_or('_')
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

/// Rename a paper's PDF file based on its metadata
#[tauri::command]
pub fn rename_paper_pdf(
    app: AppHandle,
    db: State<'_, DbConnection>,
    paper_id: String,
    config: Option<RenameConfig>,
) -> Result<RenameResult, AppError> {
    let conn = db.get()?;
    let paper = crate::db::papers::get_paper(&conn, &paper_id)?;

    if paper.pdf_path.is_empty() {
        return Err(AppError::Validation("Paper has no PDF attached".to_string()));
    }

    let old_path = PathBuf::from(&paper.pdf_path);
    if !old_path.exists() {
        return Err(AppError::NotFound(format!(
            "PDF file not found: {}",
            paper.pdf_path
        )));
    }

    let config = config.unwrap_or_default();
    let new_filename = generate_filename_from_paper(&paper, &config);

    // Preserve the paper ID prefix for uniqueness
    let id_prefix = paper.id.split('-').next().unwrap_or(&paper.id);
    let final_filename = format!("{}_{}", id_prefix, new_filename);

    let parent = old_path.parent().ok_or_else(|| {
        AppError::Io("Could not determine PDF directory".to_string())
    })?;

    let new_path = parent.join(&final_filename);

    // Check if new path already exists (and is different from old path)
    if new_path != old_path && new_path.exists() {
        return Err(AppError::Validation(format!(
            "Target file already exists: {}",
            new_path.display()
        )));
    }

    let old_filename = paper.pdf_filename.clone();
    let old_path_str = paper.pdf_path.clone();

    // Rename the file
    if new_path != old_path {
        std::fs::rename(&old_path, &new_path)?;

        // Update paper record
        let update_input = crate::models::UpdatePaperInput {
            pdf_path: Some(new_path.to_string_lossy().to_string()),
            pdf_filename: Some(final_filename.clone()),
            ..Default::default()
        };

        crate::db::papers::update_paper(&conn, &paper_id, update_input)?;

        // Emit event
        let _ = app.emit("papers-changed", &paper.folder_id);
    }

    Ok(RenameResult {
        paper_id,
        old_path: old_path_str,
        new_path: new_path.to_string_lossy().to_string(),
        old_filename,
        new_filename: final_filename,
        success: true,
        error: None,
    })
}

/// Batch rename multiple papers' PDFs
#[tauri::command]
pub fn batch_rename_pdfs(
    app: AppHandle,
    db: State<'_, DbConnection>,
    paper_ids: Vec<String>,
    config: Option<RenameConfig>,
) -> Result<Vec<RenameResult>, AppError> {
    let config = config.unwrap_or_default();
    let mut results = Vec::new();

    for paper_id in paper_ids {
        match rename_paper_pdf(app.clone(), db.clone(), paper_id.clone(), Some(config.clone())) {
            Ok(result) => results.push(result),
            Err(e) => {
                results.push(RenameResult {
                    paper_id: paper_id.clone(),
                    old_path: String::new(),
                    new_path: String::new(),
                    old_filename: String::new(),
                    new_filename: String::new(),
                    success: false,
                    error: Some(e.to_string()),
                });
            }
        }
    }

    Ok(results)
}

/// Get the default rename configuration
#[tauri::command]
pub fn get_rename_config(db: State<'_, DbConnection>) -> Result<RenameConfig, AppError> {
    let conn = db.get()?;

    let pattern = crate::db::settings::get_setting(&conn, "rename_pattern")?
        .unwrap_or_else(|| "{author}_{year}_{title}".to_string());

    let max_title_length = crate::db::settings::get_setting(&conn, "rename_max_title_length")?
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);

    let space_replacement = crate::db::settings::get_setting(&conn, "rename_space_replacement")?
        .unwrap_or_else(|| "_".to_string());

    let lowercase = crate::db::settings::get_setting(&conn, "rename_lowercase")?
        .map(|s| s == "true")
        .unwrap_or(false);

    Ok(RenameConfig {
        pattern,
        max_title_length,
        space_replacement,
        lowercase,
    })
}

/// Save the default rename configuration
#[tauri::command]
pub fn save_rename_config(db: State<'_, DbConnection>, config: RenameConfig) -> Result<(), AppError> {
    let conn = db.get()?;

    crate::db::settings::set_setting(&conn, "rename_pattern", &config.pattern)?;
    crate::db::settings::set_setting(&conn, "rename_max_title_length", &config.max_title_length.to_string())?;
    crate::db::settings::set_setting(&conn, "rename_space_replacement", &config.space_replacement)?;
    crate::db::settings::set_setting(&conn, "rename_lowercase", &config.lowercase.to_string())?;

    Ok(())
}

/// Preview what the renamed filename would be without actually renaming
#[tauri::command]
pub fn preview_rename(
    db: State<'_, DbConnection>,
    paper_id: String,
    config: Option<RenameConfig>,
) -> Result<RenameResult, AppError> {
    let conn = db.get()?;
    let paper = crate::db::papers::get_paper(&conn, &paper_id)?;

    let config = config.unwrap_or_default();
    let new_filename = generate_filename_from_paper(&paper, &config);

    let id_prefix = paper.id.split('-').next().unwrap_or(&paper.id);
    let final_filename = format!("{}_{}", id_prefix, new_filename);

    let old_path = PathBuf::from(&paper.pdf_path);
    let new_path = if !paper.pdf_path.is_empty() {
        old_path
            .parent()
            .map(|p| p.join(&final_filename).to_string_lossy().to_string())
            .unwrap_or_default()
    } else {
        String::new()
    };

    Ok(RenameResult {
        paper_id,
        old_path: paper.pdf_path,
        new_path,
        old_filename: paper.pdf_filename,
        new_filename: final_filename,
        success: true,
        error: None,
    })
}
