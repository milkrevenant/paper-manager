'use client';

import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  getFolders as fetchFolders,
  getAllFolders as fetchAllFolders,
  createFolder as createFolderCmd,
  updateFolder as updateFolderCmd,
  deleteFolder as deleteFolderCmd,
  isTauri,
} from '@/lib/tauri';
import type { Folder, CreateFolderInput, UpdateFolderInput } from '@/lib/tauri';

// Demo data for non-Tauri environment
const DEMO_FOLDERS: Folder[] = [
  {
    id: 'folder-1',
    topicId: 'topic-1',
    name: '딥러닝 기초',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'folder-2',
    topicId: 'topic-1',
    name: 'NLP 연구',
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'folder-3',
    topicId: 'topic-2',
    name: '강화학습',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface UseFoldersOptions {
  topicId?: string | null;
}

interface UseFoldersReturn {
  folders: Folder[];
  loading: boolean;
  error: Error | null;
  addFolder: (input: CreateFolderInput) => Promise<Folder>;
  editFolder: (folderId: string, input: UpdateFolderInput) => Promise<Folder>;
  removeFolder: (folderId: string) => Promise<void>;
  refresh: () => void;
}

export function useFolders(options: UseFoldersOptions = {}): UseFoldersReturn {
  const { topicId = null } = options;
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFolders = useCallback(async () => {
    if (!isTauri()) {
      const filtered = topicId
        ? DEMO_FOLDERS.filter((f) => f.topicId === topicId)
        : DEMO_FOLDERS;
      setFolders(filtered);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = topicId
        ? await fetchFolders(topicId)
        : await fetchAllFolders();
      setFolders(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load folders:', err);
      setError(err as Error);
      const filtered = topicId
        ? DEMO_FOLDERS.filter((f) => f.topicId === topicId)
        : DEMO_FOLDERS;
      setFolders(filtered);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Listen for Tauri events
  useEffect(() => {
    if (!isTauri()) return;

    const unlisten = listen<string>('folders-changed', (event) => {
      if (!topicId || event.payload === topicId) {
        loadFolders();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [topicId, loadFolders]);

  const addFolder = useCallback(async (input: CreateFolderInput) => {
    if (!isTauri()) {
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        ...input,
        sortOrder: folders.filter((f) => f.topicId === input.topicId).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setFolders((prev) => [...prev, newFolder]);
      return newFolder;
    }
    return createFolderCmd(input);
  }, [folders]);

  const editFolder = useCallback(async (folderId: string, input: UpdateFolderInput) => {
    if (!isTauri()) {
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId
            ? { ...f, ...input, updatedAt: new Date().toISOString() }
            : f
        )
      );
      return folders.find((f) => f.id === folderId)!;
    }
    return updateFolderCmd(folderId, input);
  }, [folders]);

  const removeFolder = useCallback(async (folderId: string) => {
    if (!isTauri()) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      return;
    }
    return deleteFolderCmd(folderId);
  }, []);

  return {
    folders,
    loading,
    error,
    addFolder,
    editFolder,
    removeFolder,
    refresh: loadFolders,
  };
}

export function useAllFolders() {
  return useFolders({ topicId: null });
}
