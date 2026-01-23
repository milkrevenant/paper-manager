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
