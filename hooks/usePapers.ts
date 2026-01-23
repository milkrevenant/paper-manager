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

// Demo data for non-Tauri environment
const DEMO_PAPERS: Paper[] = [
  {
    id: 'paper-1',
    folderId: 'folder-1',
    paperNumber: 1,
    keywords: 'deep learning, NLP, transformer',
    author: 'Smith, J.',
    year: 2023,
    title: 'Deep Learning Approaches for Natural Language Processing',
    publisher: 'Nature',
    subject: 'Computer Science',
    purposes: ['NLP 모델 성능 향상', '효율적인 학습 방법 제안'],
    isQualitative: false,
    isQuantitative: true,
    qualTools: [],
    varsIndependent: ['모델 아키텍처', '학습률'],
    varsDependent: ['정확도', 'F1 점수'],
    varsModerator: [],
    varsMediator: [],
    varsOthers: [],
    quantTechniques: ['회귀분석', 'ANOVA'],
    results: ['Transformer 모델이 RNN보다 15% 높은 정확도'],
    limitations: ['대규모 데이터셋 필요'],
    implications: ['향후 NLP 연구 방향 제시'],
    futurePlans: ['다국어 지원 확장'],
    pdfPath: '',
    pdfFilename: '',
    userNotes: '중요한 논문. 재검토 필요.',
    tags: ['AI', 'NLP'],
    isRead: true,
    importance: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAnalyzedAt: new Date().toISOString(),
  },
  {
    id: 'paper-2',
    folderId: 'folder-3',
    paperNumber: 2,
    keywords: 'reinforcement learning, robotics',
    author: 'Kim, H.',
    year: 2022,
    title: 'Reinforcement Learning in Robotics',
    publisher: 'IEEE',
    subject: 'Robotics',
    purposes: ['로봇 학습 효율 개선'],
    isQualitative: false,
    isQuantitative: true,
    qualTools: [],
    varsIndependent: ['보상 함수'],
    varsDependent: ['학습 속도'],
    varsModerator: [],
    varsMediator: [],
    varsOthers: [],
    quantTechniques: ['시뮬레이션'],
    results: ['학습 시간 30% 단축'],
    limitations: ['시뮬레이션 환경에서만 테스트'],
    implications: ['실제 로봇 적용 가능성'],
    futurePlans: ['실제 로봇 테스트'],
    pdfPath: '',
    pdfFilename: '',
    userNotes: '',
    tags: ['RL', 'Robotics'],
    isRead: false,
    importance: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAnalyzedAt: null,
  },
];

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
