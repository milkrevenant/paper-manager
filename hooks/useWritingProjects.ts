'use client';

import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { WritingProject, CreateWritingProjectInput, UpdateWritingProjectInput } from '@/lib/tauri/types';
import {
  isTauri,
  getWritingProjects,
  createWritingProject as createProject,
  updateWritingProject as updateProject,
  deleteWritingProject as deleteProject,
} from '@/lib/tauri/commands';

export function useWritingProjects() {
  const [projects, setProjects] = useState<WritingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getWritingProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch writing projects:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Listen for changes
  useEffect(() => {
    if (!isTauri()) return;

    const unlisten = listen('writing-projects-changed', () => {
      fetchProjects();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchProjects]);

  const createWritingProject = useCallback(
    async (input: CreateWritingProjectInput): Promise<WritingProject> => {
      const project = await createProject(input);
      await fetchProjects();
      return project;
    },
    [fetchProjects]
  );

  const updateWritingProject = useCallback(
    async (projectId: string, input: UpdateWritingProjectInput): Promise<WritingProject> => {
      const project = await updateProject(projectId, input);
      await fetchProjects();
      return project;
    },
    [fetchProjects]
  );

  const deleteWritingProject = useCallback(
    async (projectId: string): Promise<void> => {
      await deleteProject(projectId);
      await fetchProjects();
    },
    [fetchProjects]
  );

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createWritingProject,
    updateWritingProject,
    deleteWritingProject,
  };
}
