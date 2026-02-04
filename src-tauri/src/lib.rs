mod commands;
mod db;
mod error;
mod models;

use tauri::Manager;

use db::DbConnection;
use commands::automation::WatchFolderState;

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

            // Initialize watch folder state
            app.manage(WatchFolderState::default());

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
            commands::papers::batch_update_papers,
            commands::papers::batch_delete_papers,
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
            // AI Analysis
            commands::ai_analysis::analyze_paper,
            commands::ai_analysis::summarize_text,
            commands::ai_analysis::translate_text,
            // Highlights
            commands::highlights::get_highlights,
            commands::highlights::get_highlight,
            commands::highlights::create_highlight,
            commands::highlights::update_highlight,
            commands::highlights::delete_highlight,
            // PDF Indexing & Full-Text Search
            commands::pdf_indexing::index_paper,
            commands::pdf_indexing::index_all_papers,
            commands::pdf_indexing::search_full_text,
            commands::pdf_indexing::get_paper_index_status,
            // Citations
            commands::citations::export_bibtex,
            commands::citations::export_bibtex_batch,
            commands::citations::export_ris,
            commands::citations::export_ris_batch,
            commands::citations::generate_citation,
            commands::citations::generate_citation_batch,
            commands::citations::get_citation_styles,
            // Automation - Smart Groups
            commands::automation::get_smart_group_papers,
            commands::automation::get_predefined_smart_groups,
            commands::automation::create_smart_group,
            commands::automation::get_smart_groups,
            commands::automation::delete_smart_group,
            // Automation - Watch Folders
            commands::automation::create_watch_folder,
            commands::automation::get_watch_folders,
            commands::automation::delete_watch_folder,
            commands::automation::toggle_watch_folder,
            commands::automation::start_watching,
            commands::automation::stop_watching,
            commands::automation::scan_watch_folder,
            commands::automation::import_from_watch_folder,
            // Automation - PDF Auto-Rename
            commands::automation::generate_paper_filename,
            commands::automation::rename_paper_pdf,
            commands::automation::batch_rename_pdfs,
            commands::automation::get_rename_config,
            commands::automation::save_rename_config,
            commands::automation::preview_rename,
            // Writing - Projects
            commands::writing::get_writing_projects,
            commands::writing::get_writing_project,
            commands::writing::create_writing_project,
            commands::writing::update_writing_project,
            commands::writing::delete_writing_project,
            commands::writing::open_writing_project,
            // Writing - Documents
            commands::writing::get_writing_documents,
            commands::writing::get_writing_document,
            commands::writing::create_writing_document,
            commands::writing::update_writing_document,
            commands::writing::delete_writing_document,
            commands::writing::move_writing_document,
            // Writing - Export
            commands::writing::export_project_markdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
