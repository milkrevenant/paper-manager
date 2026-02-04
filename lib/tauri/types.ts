// Topic Types
export interface Topic {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTopicInput {
  name: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
}

export interface UpdateTopicInput {
  name?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: string | null;
}

// Folder Types
export interface Folder {
  id: string;
  topicId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderInput {
  topicId: string;
  name: string;
}

export interface UpdateFolderInput {
  name?: string;
  sortOrder?: number;
}

// Paper Types
export interface Paper {
  id: string;
  folderId: string;
  paperNumber: number;

  // Bibliographic info
  keywords: string;
  author: string;
  year: number;
  title: string;
  publisher: string;
  subject: string;

  // Research design
  purposes: string[];
  isQualitative: boolean;
  isQuantitative: boolean;

  // Qualitative
  qualTools: string[];

  // Quantitative
  varsIndependent: string[];
  varsDependent: string[];
  varsModerator: string[];
  varsMediator: string[];
  varsOthers: string[];
  quantTechniques: string[];

  // Results
  results: string[];
  limitations: string[];
  implications: string[];
  futurePlans: string[];

  // File management
  pdfPath: string;
  pdfFilename: string;

  // User metadata
  userNotes: string;
  tags: string[];
  isRead: boolean;
  importance: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastAnalyzedAt: string | null;
}

export interface CreatePaperInput {
  folderId: string;
  title: string;
  author?: string;
  year?: number;
  pdfPath?: string;
  pdfFilename?: string;
}

export interface UpdatePaperInput {
  folderId?: string;
  keywords?: string;
  author?: string;
  year?: number;
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
  pdfPath?: string;
  pdfFilename?: string;
  userNotes?: string;
  tags?: string[];
  isRead?: boolean;
  importance?: number;
  lastAnalyzedAt?: string | null;
}

// Settings Types
export interface AppSettings {
  geminiApiKey: string | null;
  openaiApiKey: string | null;
  defaultFontFamily: string | null;
  defaultFontSize: string | null;
  storagePath: string | null;
  googleAccountEmail: string | null;
}

// Google OAuth Types
export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  email: string | null;
}

// Paper Search Types
export interface SearchAuthor {
  authorId: string | null;
  name: string;
}

export interface OpenAccessPdf {
  url: string | null;
  status: string | null;
}

export interface ExternalIds {
  doi: string | null;
  arxivId: string | null;
  pubmed: string | null;
  pubmedCentral: string | null;
}

export interface SearchResult {
  paperId: string;
  title: string;
  authors: SearchAuthor[];
  year: number | null;
  abstractText: string | null;
  venue: string | null;
  citationCount: number | null;
  url: string | null;
  openAccessPdf: OpenAccessPdf | null;
  externalIds: ExternalIds | null;
}

export type SearchSource =
  | 'semantic_scholar'
  | 'pubmed'
  | 'crossref'
  | 'arxiv'
  | 'kci'
  | 'google_scholar';

export interface SearchQuery {
  query: string;
  source?: SearchSource;
  limit?: number;
  offset?: number;
  year?: string;
  fieldsOfStudy?: string[];
}

export interface SearchResponse {
  total: number;
  results: SearchResult[];
}

// Google Drive Types
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string | null;
  modifiedTime: string | null;
  size: string | null;
}

export interface SyncStatus {
  lastSync: string | null;
  dbSynced: boolean;
  pdfsSynced: number;
  totalPdfs: number;
}

// Highlight Types
export interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  paperId: string;
  pageNumber: number;
  rects: HighlightRect[];
  selectedText: string;
  color: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHighlightInput {
  paperId: string;
  pageNumber: number;
  rects: HighlightRect[];
  selectedText: string;
  color?: string;
  note?: string;
}

export interface UpdateHighlightInput {
  color?: string;
  note?: string;
}

// Full-Text Search Types
export interface FullTextSearchResult {
  paperId: string;
  paperTitle: string;
  paperAuthor: string;
  pageNumber: number;
  snippet: string;
  rank: number;
}

export interface FullTextSearchQuery {
  query: string;
  limit?: number;
  offset?: number;
  folderId?: string;
}

export interface FullTextSearchResponse {
  total: number;
  results: FullTextSearchResult[];
}

export interface IndexingStatus {
  paperId: string;
  totalPages: number;
  indexedPages: number;
  isComplete: boolean;
  error?: string;
}

// Citation Types
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard';

export interface CitationExport {
  format: string;
  content: string;
  paperId: string;
}

export interface BatchCitationExport {
  format: string;
  content: string;
  paperCount: number;
}

// ============================================================================
// Automation Types - Smart Groups
// ============================================================================

/**
 * Criteria types for smart grouping of papers.
 * Uses discriminated union pattern with 'type' field.
 */
export type SmartGroupCriteria =
  | { type: 'byYear'; value: number }
  | { type: 'byYearRange'; value: { start: number; end: number } }
  | { type: 'byAuthor'; value: string }
  | { type: 'byKeyword'; value: string }
  | { type: 'byTag'; value: string }
  | { type: 'byReadStatus'; value: boolean }
  | { type: 'byImportance'; value: number }
  | { type: 'byResearchType'; value: { qualitative: boolean; quantitative: boolean } }
  | { type: 'recentlyAdded'; value: number }
  | { type: 'recentlyAnalyzed'; value: number }
  | { type: 'byPublisher'; value: string }
  | { type: 'bySubject'; value: string }
  | { type: 'noPdf' }
  | { type: 'hasPdf' }
  | { type: 'unread' }
  | { type: 'favorites' };

/**
 * A smart group definition that auto-groups papers by criteria.
 */
export interface SmartGroup {
  id: string;
  name: string;
  criteria: SmartGroupCriteria[];
  /** How to combine criteria: "and" or "or" */
  matchMode: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
}

/**
 * Result of a smart group query.
 */
export interface SmartGroupResult {
  group: SmartGroup;
  papers: Paper[];
  count: number;
}

/**
 * Input for creating a new smart group.
 */
export interface CreateSmartGroupInput {
  name: string;
  criteria: SmartGroupCriteria[];
  matchMode?: string;
  icon?: string;
  color?: string;
}

// ============================================================================
// Automation Types - Watch Folders
// ============================================================================

/**
 * Watch folder configuration for auto-import.
 */
export interface WatchFolder {
  id: string;
  path: string;
  targetFolderId: string;
  autoAnalyze: boolean;
  autoRename: boolean;
  isActive: boolean;
  createdAt: string;
}

/**
 * Input for creating a watch folder.
 */
export interface CreateWatchFolderInput {
  path: string;
  targetFolderId: string;
  autoAnalyze?: boolean;
  autoRename?: boolean;
}

/**
 * Event emitted when a file is detected in a watch folder.
 */
export interface WatchFolderEvent {
  watchFolderId: string;
  filePath: string;
  fileName: string;
  eventType: string;
}

// ============================================================================
// Automation Types - PDF Auto-Rename
// ============================================================================

/**
 * Configuration for PDF auto-rename.
 */
export interface RenameConfig {
  /** Pattern for renaming: {author}, {year}, {title}, {keywords}, {publisher} */
  pattern: string;
  /** Maximum length for title in filename */
  maxTitleLength: number;
  /** Character to replace spaces with */
  spaceReplacement: string;
  /** Whether to lowercase the filename */
  lowercase: boolean;
}

/**
 * Result of a rename operation.
 */
export interface RenameResult {
  paperId: string;
  oldPath: string;
  newPath: string;
  oldFilename: string;
  newFilename: string;
  success: boolean;
  error: string | null;
}

// ============================================================================
// Writing Types - Scrivener-like Writing Workspace
// ============================================================================

/**
 * Writing project status.
 */
export type WritingProjectStatus = 'draft' | 'in-progress' | 'completed' | 'archived';

/**
 * Writing project type - standalone or linked to a paper.
 */
export type WritingProjectType = 'standalone' | 'paper-linked';

/**
 * Writing document status for tracking progress.
 */
export type WritingDocumentStatus = 'todo' | 'in-progress' | 'first-draft' | 'revised' | 'done';

/**
 * Writing document content type.
 */
export type WritingDocumentContentType = 'text' | 'folder';

/**
 * A writing project that can contain multiple documents.
 */
export interface WritingProject {
  id: string;
  title: string;
  description: string;
  type: WritingProjectType;
  linkedPaperId: string | null;
  rootDocumentId: string | null;
  targetWordCount: number | null;
  status: WritingProjectStatus;
  metadata: {
    genre?: string;
    tags?: string[];
    exportFormat?: 'pdf' | 'docx' | 'markdown';
  };
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

/**
 * A document within a writing project (can be nested).
 */
export interface WritingDocument {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  content: string;  // HTML content
  contentType: WritingDocumentContentType;
  sortOrder: number;
  isExpanded: boolean;
  synopsis: string;
  notes: string;
  status: WritingDocumentStatus;
  wordCount: number;
  targetWordCount: number | null;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new writing project.
 */
export interface CreateWritingProjectInput {
  title: string;
  description?: string;
  type?: WritingProjectType;
  linkedPaperId?: string | null;
  targetWordCount?: number | null;
}

/**
 * Input for updating a writing project.
 */
export interface UpdateWritingProjectInput {
  title?: string;
  description?: string;
  type?: WritingProjectType;
  linkedPaperId?: string | null;
  targetWordCount?: number | null;
  status?: WritingProjectStatus;
  metadata?: {
    genre?: string;
    tags?: string[];
    exportFormat?: 'pdf' | 'docx' | 'markdown';
  };
}

/**
 * Input for creating a new writing document.
 */
export interface CreateWritingDocumentInput {
  projectId: string;
  parentId?: string | null;
  title: string;
  contentType?: WritingDocumentContentType;
  sortOrder?: number;
}

/**
 * Input for updating a writing document.
 */
export interface UpdateWritingDocumentInput {
  title?: string;
  content?: string;
  contentType?: WritingDocumentContentType;
  sortOrder?: number;
  isExpanded?: boolean;
  synopsis?: string;
  notes?: string;
  status?: WritingDocumentStatus;
  wordCount?: number;
  targetWordCount?: number | null;
  labels?: string[];
}

/**
 * Input for moving a document within the tree.
 */
export interface MoveWritingDocumentInput {
  parentId: string | null;
  sortOrder: number;
}

/**
 * Export options for PDF export.
 */
export interface PdfExportOptions {
  pageSize?: 'a4' | 'letter';
  margins?: { top: number; right: number; bottom: number; left: number };
  fontFamily?: string;
  fontSize?: number;
  includeTableOfContents?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

/**
 * Export options for DOCX export.
 */
export interface DocxExportOptions {
  templatePath?: string;
  includeTableOfContents?: boolean;
}
