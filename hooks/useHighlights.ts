'use client';

import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  getHighlights as fetchHighlights,
  createHighlight as createHighlightCmd,
  updateHighlight as updateHighlightCmd,
  deleteHighlight as deleteHighlightCmd,
  isTauri,
} from '@/lib/tauri/commands';
import type { Highlight, CreateHighlightInput, UpdateHighlightInput } from '@/lib/tauri/types';

interface UseHighlightsOptions {
  paperId: string | null;
  pageNumber?: number;
}

interface UseHighlightsReturn {
  highlights: Highlight[];
  loading: boolean;
  error: Error | null;
  addHighlight: (input: CreateHighlightInput) => Promise<Highlight | null>;
  editHighlight: (highlightId: string, input: UpdateHighlightInput) => Promise<void>;
  removeHighlight: (highlightId: string) => Promise<void>;
  refresh: () => void;
}

export function useHighlights(options: UseHighlightsOptions): UseHighlightsReturn {
  const { paperId, pageNumber } = options;

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadHighlights = useCallback(async () => {
    if (!paperId || !isTauri()) {
      setHighlights([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchHighlights(paperId, pageNumber);
      setHighlights(data);
      setError(null);
    } catch (err) {
      console.error('[useHighlights] Failed to load highlights:', err);
      setError(err as Error);
      setHighlights([]);
    } finally {
      setLoading(false);
    }
  }, [paperId, pageNumber]);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Listen for Tauri events
  useEffect(() => {
    if (!isTauri() || !paperId) return;

    const unlisten = listen<string>('highlights-changed', (event) => {
      if (event.payload === paperId) {
        loadHighlights();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [paperId, loadHighlights]);

  const addHighlight = useCallback(async (input: CreateHighlightInput) => {
    if (!isTauri()) return null;

    try {
      const highlight = await createHighlightCmd(input);
      // Optimistic update
      setHighlights((prev) => [...prev, highlight]);
      return highlight;
    } catch (err) {
      console.error('[useHighlights] Failed to create highlight:', err);
      throw err;
    }
  }, []);

  const editHighlight = useCallback(async (highlightId: string, input: UpdateHighlightInput) => {
    if (!isTauri()) return;

    try {
      await updateHighlightCmd(highlightId, input);
      // Optimistic update
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlightId
            ? { ...h, ...input, updatedAt: new Date().toISOString() }
            : h
        )
      );
    } catch (err) {
      console.error('[useHighlights] Failed to update highlight:', err);
      throw err;
    }
  }, []);

  const removeHighlight = useCallback(async (highlightId: string) => {
    if (!isTauri()) return;

    try {
      await deleteHighlightCmd(highlightId);
      // Optimistic update
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch (err) {
      console.error('[useHighlights] Failed to delete highlight:', err);
      throw err;
    }
  }, []);

  return {
    highlights,
    loading,
    error,
    addHighlight,
    editHighlight,
    removeHighlight,
    refresh: loadHighlights,
  };
}
