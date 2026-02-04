'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type {
  WritingDocument,
  CreateWritingDocumentInput,
  UpdateWritingDocumentInput,
  MoveWritingDocumentInput,
} from '@/lib/tauri/types';
import {
  isTauri,
  getWritingDocuments,
  createWritingDocument as createDoc,
  updateWritingDocument as updateDoc,
  deleteWritingDocument as deleteDoc,
  moveWritingDocument as moveDoc,
} from '@/lib/tauri/commands';

export function useWritingDocuments(projectId: string | null) {
  const [documents, setDocuments] = useState<WritingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Debounce timer for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!isTauri() || !projectId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getWritingDocuments(projectId);
      setDocuments(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch writing documents:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Listen for changes
  useEffect(() => {
    if (!isTauri() || !projectId) return;

    const unlisten = listen('writing-documents-changed', (event) => {
      if (event.payload === projectId) {
        fetchDocuments();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchDocuments, projectId]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const createWritingDocument = useCallback(
    async (input: CreateWritingDocumentInput): Promise<WritingDocument> => {
      const document = await createDoc(input);
      await fetchDocuments();
      return document;
    },
    [fetchDocuments]
  );

  const updateWritingDocument = useCallback(
    async (documentId: string, input: UpdateWritingDocumentInput): Promise<WritingDocument> => {
      const document = await updateDoc(documentId, input);
      // Don't refresh immediately for content updates (debounced)
      if (!input.content) {
        await fetchDocuments();
      }
      return document;
    },
    [fetchDocuments]
  );

  // Debounced update for content changes (auto-save)
  const updateDocumentContent = useCallback(
    (documentId: string, content: string, wordCount: number) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          await updateDoc(documentId, { content, wordCount });
        } catch (err) {
          console.error('Failed to save document:', err);
        }
      }, 1000); // 1 second debounce
    },
    []
  );

  const deleteWritingDocument = useCallback(
    async (documentId: string): Promise<void> => {
      await deleteDoc(documentId);
      await fetchDocuments();
    },
    [fetchDocuments]
  );

  const moveWritingDocument = useCallback(
    async (documentId: string, input: MoveWritingDocumentInput): Promise<WritingDocument> => {
      const document = await moveDoc(documentId, input);
      await fetchDocuments();
      return document;
    },
    [fetchDocuments]
  );

  // Build tree structure from flat list
  const documentTree = useCallback(() => {
    const buildTree = (parentId: string | null): WritingDocument[] => {
      return documents
        .filter((d) => d.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    };
    return buildTree(null);
  }, [documents]);

  return {
    documents,
    documentTree: documentTree(),
    loading,
    error,
    refresh: fetchDocuments,
    createWritingDocument,
    updateWritingDocument,
    updateDocumentContent,
    deleteWritingDocument,
    moveWritingDocument,
  };
}
