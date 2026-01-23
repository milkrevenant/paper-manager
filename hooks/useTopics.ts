'use client';

import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  getTopics as fetchTopics,
  createTopic as createTopicCmd,
  updateTopic as updateTopicCmd,
  deleteTopic as deleteTopicCmd,
  isTauri,
} from '@/lib/tauri';
import type { Topic, CreateTopicInput, UpdateTopicInput } from '@/lib/tauri';

// Demo data for non-Tauri environment
const DEMO_TOPICS: Topic[] = [
  {
    id: 'topic-1',
    name: '인공지능',
    color: 'blue',
    icon: 'Brain',
    sortOrder: 0,
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-2',
    name: '머신러닝',
    color: 'green',
    icon: 'Cpu',
    sortOrder: 1,
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface UseTopicsReturn {
  topics: Topic[];
  loading: boolean;
  error: Error | null;
  addTopic: (input: CreateTopicInput) => Promise<Topic>;
  editTopic: (topicId: string, input: UpdateTopicInput) => Promise<Topic>;
  removeTopic: (topicId: string) => Promise<void>;
  refresh: () => void;
}

export function useTopics(): UseTopicsReturn {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTopics = useCallback(async () => {
    if (!isTauri()) {
      setTopics(DEMO_TOPICS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchTopics();
      setTopics(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load topics:', err);
      setError(err as Error);
      setTopics(DEMO_TOPICS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Listen for Tauri events
  useEffect(() => {
    if (!isTauri()) return;

    const unlisten = listen('topics-changed', () => {
      loadTopics();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadTopics]);

  const addTopic = useCallback(async (input: CreateTopicInput) => {
    if (!isTauri()) {
      const newTopic: Topic = {
        id: `topic-${Date.now()}`,
        ...input,
        color: input.color || 'blue',
        icon: input.icon || 'BookOpen',
        sortOrder: topics.length,
        parentId: input.parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTopics((prev) => [...prev, newTopic]);
      return newTopic;
    }
    return createTopicCmd(input);
  }, [topics.length]);

  const editTopic = useCallback(async (topicId: string, input: UpdateTopicInput) => {
    if (!isTauri()) {
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicId
            ? { ...t, ...input, updatedAt: new Date().toISOString() }
            : t
        )
      );
      return topics.find((t) => t.id === topicId)!;
    }
    return updateTopicCmd(topicId, input);
  }, [topics]);

  const removeTopic = useCallback(async (topicId: string) => {
    if (!isTauri()) {
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
      return;
    }
    return deleteTopicCmd(topicId);
  }, []);

  return {
    topics,
    loading,
    error,
    addTopic,
    editTopic,
    removeTopic,
    refresh: loadTopics,
  };
}
