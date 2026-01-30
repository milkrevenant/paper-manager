use crate::db::DbConnection;
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

const DRIVE_API_BASE: &str = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE: &str = "https://www.googleapis.com/upload/drive/v3";

// Folder name in Google Drive for app data
const APP_FOLDER_NAME: &str = "PaperManager";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveFile {
    pub id: String,
    pub name: String,
    pub mime_type: Option<String>,
    pub modified_time: Option<String>,
    pub size: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DriveListResponse {
    files: Vec<DriveFileResponse>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DriveFileResponse {
    id: String,
    name: String,
    mime_type: Option<String>,
    modified_time: Option<String>,
    size: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub last_sync: Option<String>,
    pub db_synced: bool,
    pub pdfs_synced: i32,
    pub total_pdfs: i32,
}

/// Get access token from stored tokens, refreshing if needed
async fn get_valid_token(db: &State<'_, DbConnection>) -> Result<String, AppError> {
    use super::google_auth::{get_google_tokens, refresh_google_token};

    let tokens = get_google_tokens(db.clone())?
        .ok_or_else(|| AppError::Auth("No Google account connected".to_string()))?;

    // Check if token is expired (with 5 min buffer)
    let now = chrono::Utc::now().timestamp();
    if tokens.expires_at < now + 300 {
        // Token expired or expiring soon, refresh it
        let new_tokens = refresh_google_token(db.clone()).await?;
        Ok(new_tokens.access_token)
    } else {
        Ok(tokens.access_token)
    }
}

/// Find or create the app folder in Google Drive
async fn get_or_create_app_folder(access_token: &str) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    // Search for existing folder
    let search_url = format!(
        "{}/files?q=name='{}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)",
        DRIVE_API_BASE, APP_FOLDER_NAME
    );

    let response = client
        .get(&search_url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let error = response.text().await.unwrap_or_default();
        return Err(AppError::Network(format!("Failed to search Drive: {}", error)));
    }

    let list: DriveListResponse = response.json().await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    // Return existing folder if found
    if let Some(folder) = list.files.first() {
        return Ok(folder.id.clone());
    }

    // Create new folder
    let metadata = serde_json::json!({
        "name": APP_FOLDER_NAME,
        "mimeType": "application/vnd.google-apps.folder"
    });

    let create_response = client
        .post(&format!("{}/files", DRIVE_API_BASE))
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .json(&metadata)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !create_response.status().is_success() {
        let error = create_response.text().await.unwrap_or_default();
        return Err(AppError::Network(format!("Failed to create folder: {}", error)));
    }

    #[derive(Deserialize)]
    struct CreateResponse {
        id: String,
    }

    let created: CreateResponse = create_response.json().await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    Ok(created.id)
}

/// Upload a file to Google Drive
async fn upload_file(
    access_token: &str,
    folder_id: &str,
    file_path: &PathBuf,
    file_name: &str,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    // Read file content
    let file_content = std::fs::read(file_path)
        .map_err(|e| AppError::Io(e.to_string()))?;

    // Check if file already exists in folder
    let search_url = format!(
        "{}/files?q=name='{}' and '{}' in parents and trashed=false&fields=files(id)",
        DRIVE_API_BASE, file_name, folder_id
    );

    let search_response = client
        .get(&search_url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    let existing: DriveListResponse = search_response.json().await.unwrap_or(DriveListResponse { files: vec![] });

    if let Some(existing_file) = existing.files.first() {
        // Update existing file
        let update_url = format!(
            "{}/files/{}?uploadType=media",
            DRIVE_UPLOAD_BASE, existing_file.id
        );

        let response = client
            .patch(&update_url)
            .bearer_auth(access_token)
            .header("Content-Type", "application/octet-stream")
            .body(file_content)
            .send()
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_default();
            return Err(AppError::Network(format!("Failed to update file: {}", error)));
        }

        Ok(existing_file.id.clone())
    } else {
        // Create new file with multipart upload
        let metadata = serde_json::json!({
            "name": file_name,
            "parents": [folder_id]
        });

        let boundary = "paper_manager_boundary";
        let mut body = Vec::new();

        // Metadata part
        body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
        body.extend_from_slice(b"Content-Type: application/json; charset=UTF-8\r\n\r\n");
        body.extend_from_slice(serde_json::to_string(&metadata).unwrap().as_bytes());
        body.extend_from_slice(b"\r\n");

        // File content part
        body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
        body.extend_from_slice(b"Content-Type: application/octet-stream\r\n\r\n");
        body.extend_from_slice(&file_content);
        body.extend_from_slice(b"\r\n");
        body.extend_from_slice(format!("--{}--", boundary).as_bytes());

        let response = client
            .post(&format!("{}/files?uploadType=multipart", DRIVE_UPLOAD_BASE))
            .bearer_auth(access_token)
            .header("Content-Type", format!("multipart/related; boundary={}", boundary))
            .body(body)
            .send()
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_default();
            return Err(AppError::Network(format!("Failed to upload file: {}", error)));
        }

        #[derive(Deserialize)]
        struct UploadResponse {
            id: String,
        }

        let uploaded: UploadResponse = response.json().await
            .map_err(|e| AppError::Parse(e.to_string()))?;

        Ok(uploaded.id)
    }
}

/// Download a file from Google Drive
async fn download_file(
    access_token: &str,
    file_id: &str,
    destination: &PathBuf,
) -> Result<(), AppError> {
    let client = reqwest::Client::new();

    let url = format!("{}/files/{}?alt=media", DRIVE_API_BASE, file_id);

    let response = client
        .get(&url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let error = response.text().await.unwrap_or_default();
        return Err(AppError::Network(format!("Failed to download file: {}", error)));
    }

    let content = response.bytes().await
        .map_err(|e| AppError::Network(e.to_string()))?;

    // Ensure parent directory exists
    if let Some(parent) = destination.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Io(e.to_string()))?;
    }

    std::fs::write(destination, content)
        .map_err(|e| AppError::Io(e.to_string()))?;

    Ok(())
}

/// Backup database to Google Drive
#[tauri::command]
pub async fn backup_to_drive(
    app: AppHandle,
    db: State<'_, DbConnection>,
) -> Result<String, AppError> {
    let access_token = get_valid_token(&db).await?;
    let folder_id = get_or_create_app_folder(&access_token).await?;

    // Get database path
    let app_data = app.path().app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))?;
    let db_path = app_data.join("papers.db");

    if !db_path.exists() {
        return Err(AppError::NotFound("Database file not found".to_string()));
    }

    // Upload database
    let file_id = upload_file(&access_token, &folder_id, &db_path, "papers.db").await?;

    // Update last sync timestamp
    let conn = db.get().map_err(|e| AppError::Database(e.to_string()))?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_drive_sync', datetime('now'), datetime('now'))",
        [],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    Ok(file_id)
}

/// Restore database from Google Drive
#[tauri::command]
pub async fn restore_from_drive(
    app: AppHandle,
    db: State<'_, DbConnection>,
) -> Result<(), AppError> {
    let access_token = get_valid_token(&db).await?;
    let folder_id = get_or_create_app_folder(&access_token).await?;

    let client = reqwest::Client::new();

    // Find database file in Drive
    let search_url = format!(
        "{}/files?q=name='papers.db' and '{}' in parents and trashed=false&fields=files(id,modifiedTime)",
        DRIVE_API_BASE, folder_id
    );

    let response = client
        .get(&search_url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    let list: DriveListResponse = response.json().await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let file = list.files.first()
        .ok_or_else(|| AppError::NotFound("No backup found in Drive".to_string()))?;

    // Download to temp location first
    let app_data = app.path().app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))?;
    let temp_path = app_data.join("papers_restore.db");
    let db_path = app_data.join("papers.db");

    download_file(&access_token, &file.id, &temp_path).await?;

    // Close current connection and replace database
    // Note: In a real implementation, you'd want to properly close the connection
    std::fs::rename(&temp_path, &db_path)
        .map_err(|e| AppError::Io(e.to_string()))?;

    Ok(())
}

/// Get sync status
#[tauri::command]
pub fn get_sync_status(
    _app: AppHandle,
    db: State<'_, DbConnection>,
) -> Result<SyncStatus, AppError> {
    let conn = db.get().map_err(|e| AppError::Database(e.to_string()))?;

    // Get last sync time
    let last_sync: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'last_drive_sync'",
            [],
            |row| row.get(0),
        )
        .ok();

    // Count PDFs
    let total_pdfs: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM papers WHERE pdf_path IS NOT NULL AND pdf_path != ''",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let db_synced = last_sync.is_some();

    Ok(SyncStatus {
        last_sync,
        db_synced,
        pdfs_synced: 0, // TODO: Track synced PDFs
        total_pdfs,
    })
}

/// List files in app folder on Drive
#[tauri::command]
pub async fn list_drive_files(
    db: State<'_, DbConnection>,
) -> Result<Vec<DriveFile>, AppError> {
    let access_token = get_valid_token(&db).await?;
    let folder_id = get_or_create_app_folder(&access_token).await?;

    let client = reqwest::Client::new();

    let url = format!(
        "{}/files?q='{}' in parents and trashed=false&fields=files(id,name,mimeType,modifiedTime,size)",
        DRIVE_API_BASE, folder_id
    );

    let response = client
        .get(&url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let error = response.text().await.unwrap_or_default();
        return Err(AppError::Network(format!("Failed to list files: {}", error)));
    }

    let list: DriveListResponse = response.json().await
        .map_err(|e| AppError::Parse(e.to_string()))?;

    Ok(list.files.into_iter().map(|f| DriveFile {
        id: f.id,
        name: f.name,
        mime_type: f.mime_type,
        modified_time: f.modified_time,
        size: f.size,
    }).collect())
}
