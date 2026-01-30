mod commands;
mod db;
mod error;
mod models;

use tauri::Manager;

use db::DbConnection;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // Create app data directory if it doesn't exist
            let app_data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data)?;

            // Initialize database
            let db_path = app_data.join("papers.db");
            let db = DbConnection::new(&db_path)
                .expect("Failed to create database connection");

            // Run migrations
            {
                let conn = db.get().expect("Failed to get database connection");
                db::migrations::run(&conn).expect("Failed to run migrations");
            }

            // Store database connection in app state
            app.manage(db);

            log::info!("Paper Manager initialized with database at {:?}", db_path);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Topics
            commands::topics::get_topics,
            commands::topics::get_topic,
            commands::topics::create_topic,
            commands::topics::update_topic,
            commands::topics::delete_topic,
            // Folders
            commands::folders::get_folders,
            commands::folders::get_all_folders,
            commands::folders::get_folder,
            commands::folders::create_folder,
            commands::folders::update_folder,
            commands::folders::delete_folder,
            // Papers
            commands::papers::get_papers,
            commands::papers::get_paper,
            commands::papers::create_paper,
            commands::papers::update_paper,
            commands::papers::delete_paper,
            commands::papers::check_duplicate,
            // PDF
            commands::pdf::import_pdf,
            commands::pdf::get_pdf_as_base64,
            commands::pdf::delete_pdf,
            commands::pdf::get_pdf_storage_path,
            // Settings
            commands::settings::get_settings,
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::update_settings,
            commands::settings::delete_setting,
            // Google OAuth
            commands::google_auth::start_google_oauth,
            commands::google_auth::handle_google_oauth_callback,
            commands::google_auth::get_google_tokens,
            commands::google_auth::refresh_google_token,
            commands::google_auth::revoke_google_tokens,
            commands::google_auth::start_oauth_server,
            // Paper Search
            commands::paper_search::search_papers,
            commands::paper_search::get_paper_details,
            commands::paper_search::search_by_doi,
            commands::paper_search::search_by_arxiv,
            commands::paper_search::get_paper_recommendations,
            // Google Drive
            commands::google_drive::backup_to_drive,
            commands::google_drive::restore_from_drive,
            commands::google_drive::get_sync_status,
            commands::google_drive::list_drive_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
