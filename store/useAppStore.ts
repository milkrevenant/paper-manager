import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarWidths {
  left: number;
  center: number;
  right: number;
}

interface AppState {
  // UI State
  selectedTopicId: string | null;
  selectedPaperId: string | null;
  sidebarWidths: SidebarWidths;
  
  // AI State
  aiEnabled: boolean;
  
  // Analysis State
  isAnalyzing: boolean;
  analysisProgress: string;
  currentAnalysisFileId: string | null;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setSelectedTopic: (id: string | null) => void;
  setSelectedPaper: (id: string | null) => void;
  setSidebarWidths: (widths: Partial<SidebarWidths>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleAI: () => void;
  
  // Analysis Actions
  startAnalysis: (fileId: string) => void;
  updateAnalysisProgress: (progress: string) => void;
  finishAnalysis: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial State
      selectedTopicId: null,
      selectedPaperId: null,
      sidebarWidths: {
        left: 260,
        center: 340,
        right: 320,
      },
      aiEnabled: true,
      isAnalyzing: false,
      analysisProgress: '',
      currentAnalysisFileId: null,
      theme: 'system',
      
      // Actions
      setSelectedTopic: (id) => set({ selectedTopicId: id }),
      setSelectedPaper: (id) => set({ selectedPaperId: id }),
      setSidebarWidths: (widths) => 
        set((state) => ({ 
          sidebarWidths: { ...state.sidebarWidths, ...widths } 
        })),
      setTheme: (theme) => set({ theme }),
      toggleAI: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
      
      // Analysis Actions
      startAnalysis: (fileId) => set({ 
        isAnalyzing: true, 
        currentAnalysisFileId: fileId,
        analysisProgress: 'PDF 읽는 중...' 
      }),
      updateAnalysisProgress: (progress) => set({ analysisProgress: progress }),
      finishAnalysis: () => set({ 
        isAnalyzing: false, 
        currentAnalysisFileId: null,
        analysisProgress: '' 
      }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        sidebarWidths: state.sidebarWidths,
        theme: state.theme,
      }),
    }
  )
);
