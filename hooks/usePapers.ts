'use client';

import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  getPapers as fetchPapers,
  createPaper as createPaperCmd,
  updatePaper as updatePaperCmd,
  deletePaper as deletePaperCmd,
  isTauri,
} from '@/lib/tauri';
import type { Paper, CreatePaperInput, UpdatePaperInput } from '@/lib/tauri';

// Re-export Paper type for backwards compatibility
export type { Paper } from '@/lib/tauri';

interface UsePapersOptions {
  folderId?: string | null;
  sortBy?: 'date' | 'name';
}

interface UsePapersReturn {
  papers: Paper[];
  loading: boolean;
  error: Error | null;
  addPaper: (input: CreatePaperInput) => Promise<string>;
  editPaper: (paperId: string, input: UpdatePaperInput) => Promise<void>;
  removePaper: (paperId: string) => Promise<void>;
  refresh: () => void;
}

export function usePapers(options: UsePapersOptions = {}): UsePapersReturn {
  const { folderId = null, sortBy = 'date' } = options;

  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPapers = useCallback(async () => {
    console.log('[usePapers] loadPapers called, isTauri:', isTauri(), 'folderId:', folderId);

    if (!isTauri()) {
      console.log('[usePapers] Not in Tauri environment, showing empty list');
      setPapers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[usePapers] Fetching papers from Tauri backend...');
      const data = await fetchPapers(folderId, sortBy);
      console.log('[usePapers] Fetched papers:', data.length, data);
      setPapers(data);
      setError(null);
    } catch (err) {
      console.error('[usePapers] Failed to load papers:', err);
      setError(err as Error);
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, [folderId, sortBy]);

  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  // Listen for Tauri events
  useEffect(() => {
    if (!isTauri()) return;

    const unlisten = listen<string>('papers-changed', (event) => {
      if (!folderId || event.payload === folderId) {
        loadPapers();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [folderId, loadPapers]);

  const addPaper = useCallback(async (input: CreatePaperInput) => {
    console.log('[usePapers] addPaper called, isTauri:', isTauri(), 'input:', input);

    if (!isTauri()) {
      console.log('[usePapers] Not in Tauri, cannot add paper');
      throw new Error('Not running in Tauri environment');
    }

    const paper = await createPaperCmd(input);
    console.log('[usePapers] Paper created:', paper);
    // Refresh papers list after adding
    loadPapers();
    return paper.id;
  }, [loadPapers]);

  const editPaper = useCallback(async (paperId: string, input: UpdatePaperInput) => {
    console.log('[usePapers] editPaper called, paperId:', paperId, 'input:', input);

    if (!isTauri()) {
      throw new Error('Not running in Tauri environment');
    }

    await updatePaperCmd(paperId, input);
    // Update local state optimistically
    setPapers((prev) =>
      prev.map((p) =>
        p.id === paperId
          ? { ...p, ...input, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const removePaper = useCallback(async (paperId: string) => {
    console.log('[usePapers] removePaper called, paperId:', paperId);

    if (!isTauri()) {
      throw new Error('Not running in Tauri environment');
    }

    await deletePaperCmd(paperId);
    // Update local state
    setPapers((prev) => prev.filter((p) => p.id !== paperId));
  }, []);

  return {
    papers,
    loading,
    error,
    addPaper,
    editPaper,
    removePaper,
    refresh: loadPapers,
  };
}

// For table view - get all papers without folder filter
export function useAllPapers(options: Omit<UsePapersOptions, 'folderId'> = {}) {
  return usePapers({ ...options, folderId: null });
}
