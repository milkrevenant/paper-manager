import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type {
  Topic,
  Folder,
  Paper,
  CreateTopicInput,
  UpdateTopicInput,
  CreateFolderInput,
  UpdateFolderInput,
  CreatePaperInput,
  UpdatePaperInput,
  AppSettings,
  GoogleTokens,
  SearchQuery,
  SearchResponse,
  SearchResult,
  DriveFile,
  SyncStatus,
  Highlight,
  CreateHighlightInput,
  UpdateHighlightInput,
  FullTextSearchQuery,
  FullTextSearchResponse,
  IndexingStatus,
  CitationStyle,
  CitationExport,
  BatchCitationExport,
  SmartGroup,
  SmartGroupCriteria,
  CreateSmartGroupInput,
  WatchFolder,
  CreateWatchFolderInput,
  RenameConfig,
  RenameResult,
  WritingProject,
  WritingDocument,
  CreateWritingProjectInput,
  UpdateWritingProjectInput,
  CreateWritingDocumentInput,
  UpdateWritingDocumentInput,
  MoveWritingDocumentInput,
} from './types';

// Check if running in Tauri environment
// Tauri v2 with withGlobalTauri: true sets window.__TAURI_INTERNALS__
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window;
};

// Topics
export const getTopics = (): Promise<Topic[]> => invoke('get_topics');

export const getTopic = (topicId: string): Promise<Topic> =>
  invoke('get_topic', { topicId });

export const createTopic = (input: CreateTopicInput): Promise<Topic> =>
  invoke('create_topic', { input });

export const updateTopic = (topicId: string, input: UpdateTopicInput): Promise<Topic> =>
  invoke('update_topic', { topicId, input });

export const deleteTopic = (topicId: string): Promise<void> =>
  invoke('delete_topic', { topicId });

// Folders
export const getFolders = (topicId: string): Promise<Folder[]> =>
  invoke('get_folders', { topicId });

export const getAllFolders = (): Promise<Folder[]> => invoke('get_all_folders');

export const getFolder = (folderId: string): Promise<Folder> =>
  invoke('get_folder', { folderId });

export const createFolder = (input: CreateFolderInput): Promise<Folder> =>
  invoke('create_folder', { input });

export const updateFolder = (folderId: string, input: UpdateFolderInput): Promise<Folder> =>
  invoke('update_folder', { folderId, input });

export const deleteFolder = (folderId: string): Promise<void> =>
  invoke('delete_folder', { folderId });

// Papers
export const getPapers = (
  folderId?: string | null,
  sortBy?: 'date' | 'name'
): Promise<Paper[]> => invoke('get_papers', { folderId, sortBy });

export const getPaper = (paperId: string): Promise<Paper> =>
  invoke('get_paper', { paperId });

export const createPaper = (input: CreatePaperInput): Promise<Paper> =>
  invoke('create_paper', { input });

export const updatePaper = (paperId: string, input: UpdatePaperInput): Promise<Paper> =>
  invoke('update_paper', { paperId, input });

export const deletePaper = (paperId: string): Promise<void> =>
  invoke('delete_paper', { paperId });

export const checkDuplicate = (title: string): Promise<boolean> =>
  invoke('check_duplicate', { title });

export const batchUpdatePapers = (
  paperIds: string[],
  input: UpdatePaperInput
): Promise<Paper[]> =>
  invoke('batch_update_papers', { paperIds, input });

export const batchDeletePapers = (paperIds: string[]): Promise<void> =>
  invoke('batch_delete_papers', { paperIds });

// PDF
export const importPdf = (sourcePath: string, paperId: string): Promise<string> =>
  invoke('import_pdf', { sourcePath, paperId });

export const getPdfAsBase64 = (pdfPath: string): Promise<string> =>
  invoke('get_pdf_as_base64', { pdfPath });

export const deletePdf = (pdfPath: string): Promise<void> =>
  invoke('delete_pdf', { pdfPath });

export const getPdfStoragePath = (): Promise<string> => invoke('get_pdf_storage_path');

// Settings
export const getSettings = (): Promise<AppSettings> => invoke('get_settings');

export const getSetting = (key: string): Promise<string | null> =>
  invoke('get_setting', { key });

export const setSetting = (key: string, value: string): Promise<void> =>
  invoke('set_setting', { key, value });

export const updateSettings = (settings: Record<string, string>): Promise<void> =>
  invoke('update_settings', { settingsMap: settings });

export const deleteSetting = (key: string): Promise<void> =>
  invoke('delete_setting', { key });

// File Dialog
export const openPdfDialog = async (): Promise<string[] | null> => {
  const result = await open({
    multiple: true,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    title: 'PDF 파일 선택',
  });

  if (!result) return null;

  // Tauri v2 returns string | string[]
  if (Array.isArray(result)) {
    return result;
  }
  return [result];
};

export const openDirectoryDialog = async (title?: string): Promise<string | null> => {
  const result = await open({
    directory: true,
    title: title || 'Select Directory',
  });

  if (!result) return null;

  // Tauri v2 returns string for single selection
  return typeof result === 'string' ? result : result[0] || null;
};

// Google OAuth
export const startGoogleOAuth = (): Promise<string> =>
  invoke('start_google_oauth');

export const handleGoogleOAuthCallback = (
  code: string,
  state: string
): Promise<GoogleTokens> =>
  invoke('handle_google_oauth_callback', { code, state });

export const getGoogleTokens = (): Promise<GoogleTokens | null> =>
  invoke('get_google_tokens');

export const refreshGoogleToken = (): Promise<GoogleTokens> =>
  invoke('refresh_google_token');

export const revokeGoogleTokens = (): Promise<void> =>
  invoke('revoke_google_tokens');

export const startOAuthServer = (): Promise<void> =>
  invoke('start_oauth_server');

// Paper Search (Semantic Scholar)
export const searchPapers = (query: SearchQuery): Promise<SearchResponse> =>
  invoke('search_papers', { query });

export const getPaperDetails = (paperId: string): Promise<SearchResult> =>
  invoke('get_paper_details', { paperId });

export const searchByDoi = (doi: string): Promise<SearchResult> =>
  invoke('search_by_doi', { doi });

export const searchByArxiv = (arxivId: string): Promise<SearchResult> =>
  invoke('search_by_arxiv', { arxivId });

export const getPaperRecommendations = (
  paperId: string,
  limit?: number
): Promise<SearchResult[]> =>
  invoke('get_paper_recommendations', { paperId, limit });

// Google Drive
export const backupToDrive = (): Promise<string> =>
  invoke('backup_to_drive');

export const restoreFromDrive = (): Promise<void> =>
  invoke('restore_from_drive');

export const getSyncStatus = (): Promise<SyncStatus> =>
  invoke('get_sync_status');

export const listDriveFiles = (): Promise<DriveFile[]> =>
  invoke('list_drive_files');

// AI Analysis
export interface AnalysisResult {
  keywords?: string;
  author?: string;
  year?: string;
  title?: string;
  publisher?: string;
  subject?: string;
  purposes?: string[];
  isQualitative?: boolean;
  isQuantitative?: boolean;
  qualTools?: string[];
  varsIndependent?: string[];
  varsDependent?: string[];
  varsModerator?: string[];
  varsMediator?: string[];
  varsOthers?: string[];
  quantTechniques?: string[];
  results?: string[];
  limitations?: string[];
  implications?: string[];
  futurePlans?: string[];
}

export const analyzePaper = (paperId: string): Promise<AnalysisResult> =>
  invoke('analyze_paper', { paperId });

export const summarizeText = (text: string): Promise<string> =>
  invoke('summarize_text', { text });

export const translateText = (text: string, targetLang: string): Promise<string> =>
  invoke('translate_text', { text, targetLang });

// Highlights
export const getHighlights = (
  paperId: string,
  pageNumber?: number
): Promise<Highlight[]> =>
  invoke('get_highlights', { paperId, pageNumber });

export const getHighlight = (highlightId: string): Promise<Highlight> =>
  invoke('get_highlight', { highlightId });

export const createHighlight = (input: CreateHighlightInput): Promise<Highlight> =>
  invoke('create_highlight', { input });

export const updateHighlight = (
  highlightId: string,
  input: UpdateHighlightInput
): Promise<Highlight> =>
  invoke('update_highlight', { highlightId, input });

export const deleteHighlight = (highlightId: string): Promise<void> =>
  invoke('delete_highlight', { highlightId });

// PDF Full-Text Search
export const searchFullText = (query: FullTextSearchQuery): Promise<FullTextSearchResponse> =>
  invoke('search_full_text', { query });

export const indexPaper = (paperId: string): Promise<IndexingStatus> =>
  invoke('index_paper', { paperId });

export const indexAllPapers = (): Promise<IndexingStatus[]> =>
  invoke('index_all_papers');

export const getPaperIndexStatus = (paperId: string): Promise<boolean> =>
  invoke('get_paper_index_status', { paperId });

// Citations
export const exportBibtex = (paperId: string): Promise<CitationExport> =>
  invoke('export_bibtex', { paperId });

export const exportBibtexBatch = (paperIds: string[]): Promise<BatchCitationExport> =>
  invoke('export_bibtex_batch', { paperIds });

export const exportRis = (paperId: string): Promise<CitationExport> =>
  invoke('export_ris', { paperId });

export const exportRisBatch = (paperIds: string[]): Promise<BatchCitationExport> =>
  invoke('export_ris_batch', { paperIds });

export const generateCitation = (
  paperId: string,
  style: CitationStyle
): Promise<CitationExport> =>
  invoke('generate_citation', { paperId, style });

export const generateCitationBatch = (
  paperIds: string[],
  style: CitationStyle
): Promise<BatchCitationExport> =>
  invoke('generate_citation_batch', { paperIds, style });

export const getCitationStyles = (): Promise<string[]> =>
  invoke('get_citation_styles');

// ============================================================================
// Automation - Smart Groups
// ============================================================================

/**
 * Get papers matching smart group criteria.
 * @param criteria - Array of criteria to match papers against
 * @param matchMode - How to combine criteria: "and" (all must match) or "or" (any must match)
 */
export const getSmartGroupPapers = (
  criteria: SmartGroupCriteria[],
  matchMode?: string
): Promise<Paper[]> =>
  invoke('get_smart_group_papers', { criteria, matchMode });

/**
 * Get predefined smart groups (built-in groups like "Unread", "Favorites", etc.).
 */
export const getPredefinedSmartGroups = (): Promise<SmartGroup[]> =>
  invoke('get_predefined_smart_groups');

/**
 * Create a custom smart group.
 */
export const createSmartGroup = (input: CreateSmartGroupInput): Promise<SmartGroup> =>
  invoke('create_smart_group', { input });

/**
 * Get all custom smart groups.
 */
export const getSmartGroups = (): Promise<SmartGroup[]> =>
  invoke('get_smart_groups');

/**
 * Delete a custom smart group.
 */
export const deleteSmartGroup = (groupId: string): Promise<void> =>
  invoke('delete_smart_group', { groupId });

// ============================================================================
// Automation - Watch Folders
// ============================================================================

/**
 * Create a new watch folder for auto-import.
 */
export const createWatchFolder = (input: CreateWatchFolderInput): Promise<WatchFolder> =>
  invoke('create_watch_folder', { input });

/**
 * Get all watch folders.
 */
export const getWatchFolders = (): Promise<WatchFolder[]> =>
  invoke('get_watch_folders');

/**
 * Delete a watch folder.
 */
export const deleteWatchFolder = (watchFolderId: string): Promise<void> =>
  invoke('delete_watch_folder', { watchFolderId });

/**
 * Toggle a watch folder's active status.
 */
export const toggleWatchFolder = (
  watchFolderId: string,
  isActive: boolean
): Promise<WatchFolder> =>
  invoke('toggle_watch_folder', { watchFolderId, isActive });

/**
 * Start watching a folder for new PDFs.
 * Emits 'watch-folder-event' when new PDFs are detected.
 */
export const startWatching = (watchFolderId: string): Promise<void> =>
  invoke('start_watching', { watchFolderId });

/**
 * Stop watching a folder.
 */
export const stopWatching = (watchFolderId: string): Promise<void> =>
  invoke('stop_watching', { watchFolderId });

/**
 * Scan a watch folder for existing PDFs.
 * Returns array of PDF file paths.
 */
export const scanWatchFolder = (watchFolderId: string): Promise<string[]> =>
  invoke('scan_watch_folder', { watchFolderId });

/**
 * Import a PDF from a watch folder.
 * Creates a paper entry and copies the PDF to storage.
 */
export const importFromWatchFolder = (
  watchFolderId: string,
  filePath: string
): Promise<Paper> =>
  invoke('import_from_watch_folder', { watchFolderId, filePath });

// ============================================================================
// Automation - PDF Auto-Rename
// ============================================================================

/**
 * Generate a filename for a paper based on its metadata.
 * Does not actually rename the file.
 */
export const generatePaperFilename = (
  paperId: string,
  config?: RenameConfig
): Promise<string> =>
  invoke('generate_paper_filename', { paperId, config });

/**
 * Rename a paper's PDF file based on its metadata.
 */
export const renamePaperPdf = (
  paperId: string,
  config?: RenameConfig
): Promise<RenameResult> =>
  invoke('rename_paper_pdf', { paperId, config });

/**
 * Batch rename multiple papers' PDFs.
 */
export const batchRenamePdfs = (
  paperIds: string[],
  config?: RenameConfig
): Promise<RenameResult[]> =>
  invoke('batch_rename_pdfs', { paperIds, config });

/**
 * Get the current rename configuration.
 */
export const getRenameConfig = (): Promise<RenameConfig> =>
  invoke('get_rename_config');

/**
 * Save the rename configuration.
 */
export const saveRenameConfig = (config: RenameConfig): Promise<void> =>
  invoke('save_rename_config', { config });

/**
 * Preview what a renamed filename would be without actually renaming.
 */
export const previewRename = (
  paperId: string,
  config?: RenameConfig
): Promise<RenameResult> =>
  invoke('preview_rename', { paperId, config });

// ============================================================================
// Writing - Projects
// ============================================================================

/**
 * Get all writing projects.
 */
export const getWritingProjects = (): Promise<WritingProject[]> =>
  invoke('get_writing_projects');

/**
 * Get a single writing project by ID.
 */
export const getWritingProject = (projectId: string): Promise<WritingProject> =>
  invoke('get_writing_project', { projectId });

/**
 * Create a new writing project.
 */
export const createWritingProject = (
  input: CreateWritingProjectInput
): Promise<WritingProject> =>
  invoke('create_writing_project', { input });

/**
 * Update a writing project.
 */
export const updateWritingProject = (
  projectId: string,
  input: UpdateWritingProjectInput
): Promise<WritingProject> =>
  invoke('update_writing_project', { projectId, input });

/**
 * Delete a writing project.
 */
export const deleteWritingProject = (projectId: string): Promise<void> =>
  invoke('delete_writing_project', { projectId });

/**
 * Open a writing project (updates lastOpenedAt).
 */
export const openWritingProject = (projectId: string): Promise<WritingProject> =>
  invoke('open_writing_project', { projectId });

// ============================================================================
// Writing - Documents
// ============================================================================

/**
 * Get all documents in a writing project.
 */
export const getWritingDocuments = (projectId: string): Promise<WritingDocument[]> =>
  invoke('get_writing_documents', { projectId });

/**
 * Get a single writing document by ID.
 */
export const getWritingDocument = (documentId: string): Promise<WritingDocument> =>
  invoke('get_writing_document', { documentId });

/**
 * Create a new writing document.
 */
export const createWritingDocument = (
  input: CreateWritingDocumentInput
): Promise<WritingDocument> =>
  invoke('create_writing_document', { input });

/**
 * Update a writing document.
 */
export const updateWritingDocument = (
  documentId: string,
  input: UpdateWritingDocumentInput
): Promise<WritingDocument> =>
  invoke('update_writing_document', { documentId, input });

/**
 * Delete a writing document.
 */
export const deleteWritingDocument = (documentId: string): Promise<void> =>
  invoke('delete_writing_document', { documentId });

/**
 * Move a writing document within the tree.
 */
export const moveWritingDocument = (
  documentId: string,
  input: MoveWritingDocumentInput
): Promise<WritingDocument> =>
  invoke('move_writing_document', { documentId, input });

// ============================================================================
// Writing - Export
// ============================================================================

/**
 * Export a writing project as Markdown.
 */
export const exportProjectMarkdown = (projectId: string): Promise<string> =>
  invoke('export_project_markdown', { projectId });
