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
