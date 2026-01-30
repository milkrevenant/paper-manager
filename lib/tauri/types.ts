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

export interface SearchQuery {
  query: string;
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
