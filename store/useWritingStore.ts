import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WritingState {
  // Selection state
  selectedProjectId: string | null;
  selectedDocumentId: string | null;

  // UI state
  isBinderVisible: boolean;
  isInspectorVisible: boolean;
  isFocusMode: boolean;

  // Session tracking
  sessionWordCount: number;
  sessionStartTime: Date | null;

  // Actions
  setSelectedProject: (id: string | null) => void;
  setSelectedDocument: (id: string | null) => void;
  toggleBinder: () => void;
  toggleInspector: () => void;
  toggleFocusMode: () => void;
  updateSessionWordCount: (count: number) => void;
  startSession: () => void;
  endSession: () => void;
  reset: () => void;
}

export const useWritingStore = create<WritingState>()(
  persist(
    (set) => ({
      // Initial state
      selectedProjectId: null,
      selectedDocumentId: null,
      isBinderVisible: true,
      isInspectorVisible: true,
      isFocusMode: false,
      sessionWordCount: 0,
      sessionStartTime: null,

      // Actions
      setSelectedProject: (id) =>
        set({ selectedProjectId: id, selectedDocumentId: null }),

      setSelectedDocument: (id) =>
        set({ selectedDocumentId: id }),

      toggleBinder: () =>
        set((state) => ({ isBinderVisible: !state.isBinderVisible })),

      toggleInspector: () =>
        set((state) => ({ isInspectorVisible: !state.isInspectorVisible })),

      toggleFocusMode: () =>
        set((state) => ({
          isFocusMode: !state.isFocusMode,
          isBinderVisible: state.isFocusMode ? true : false,
          isInspectorVisible: state.isFocusMode ? true : false,
        })),

      updateSessionWordCount: (count) =>
        set({ sessionWordCount: count }),

      startSession: () =>
        set({ sessionStartTime: new Date(), sessionWordCount: 0 }),

      endSession: () =>
        set({ sessionStartTime: null }),

      reset: () =>
        set({
          selectedProjectId: null,
          selectedDocumentId: null,
          isBinderVisible: true,
          isInspectorVisible: true,
          isFocusMode: false,
          sessionWordCount: 0,
          sessionStartTime: null,
        }),
    }),
    {
      name: 'writing-storage',
      partialize: (state) => ({
        isBinderVisible: state.isBinderVisible,
        isInspectorVisible: state.isInspectorVisible,
      }),
    }
  )
);
