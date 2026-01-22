'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TopBar } from '@/components/layout/TopBar';
import { TopicsTree } from '@/components/sidebars/TopicsTree';
import { PaperList } from '@/components/sidebars/PaperList';
import { PDFViewer } from '@/components/main/PDFViewer';
import { MetadataPanel } from '@/components/sidebars/MetadataPanel';
import { Paper } from '@/lib/db/papers';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ImperativePanelHandle,
} from "@/components/ui/resizable";

export default function DashboardPage() {
  const aiEnabled = useAppStore((state) => state.aiEnabled);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [panelVisibility, setPanelVisibility] = useState({
    panel1: true,
    panel2: true,
    panel3: true,
    panel4: true,
  });
  const [isResizing, setIsResizing] = useState(false);

  // Panel refs for imperative control
  const panel1Ref = useRef<ImperativePanelHandle>(null);
  const panel2Ref = useRef<ImperativePanelHandle>(null);
  const panel3Ref = useRef<ImperativePanelHandle>(null);
  const panel4Ref = useRef<ImperativePanelHandle>(null);

  const handleSelectFolder = (_topicId: string, folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedPaperId(null);
  };

  const handleSelectPaper = (paperId: string) => {
    setSelectedPaperId(paperId);
  };

  const handleUpdatePaper = async (data: Partial<Paper>) => {
    if (!selectedPaperId) return;
    console.log('Auto-saving paper:', selectedPaperId, data);
  };

  const handleTogglePanel = (panel: 'panel1' | 'panel2' | 'panel3' | 'panel4') => {
    const refs = {
      panel1: panel1Ref,
      panel2: panel2Ref,
      panel3: panel3Ref,
      panel4: panel4Ref,
    };

    const panelRef = refs[panel];
    const isCurrentlyVisible = panelVisibility[panel];

    if (isCurrentlyVisible) {
      panelRef.current?.collapse();
    } else {
      panelRef.current?.expand();
    }

    setPanelVisibility(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Demo paper data for metadata panel
  const selectedPaper: Paper | null = selectedPaperId
    ? {
        id: selectedPaperId,
        folderId: selectedFolderId || '',
        paperNumber: 1,
        title: 'Deep Learning Approaches for Natural Language Processing',
        author: 'Smith, J.',
        year: 2024,
        publisher: 'Nature AI',
        subject: 'Machine Learning',
        keywords: 'Deep Learning, NLP, Transformers',
        purposes: ['AI 모델 성능 향상', '자연어 처리 개선'],
        isQualitative: false,
        isQuantitative: true,
        qualTools: [],
        varsIndependent: ['학습 데이터 크기', '모델 복잡도'],
        varsDependent: ['정확도', 'F1 스코어'],
        varsModerator: [],
        varsMediator: [],
        varsOthers: [],
        quantTechniques: ['회귀분석', 'ANOVA'],
        results: ['제안된 모델이 기존 모델보다 15% 높은 성능을 보임'],
        limitations: [],
        implications: [],
        futurePlans: [],
        googleDriveFileId: '',
        googleDriveFolderId: '',
        pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf',
        userNotes: '',
        tags: [],
        isRead: false,
        importance: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAnalyzedAt: new Date(),
      }
    : null;

  return (
    <div className="h-screen w-full bg-[#faf9f5] overflow-hidden flex flex-col">
      <TopBar panelVisibility={panelVisibility} onTogglePanel={handleTogglePanel} />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className={isResizing ? 'resizing' : ''}>
          {/* Left Panel: Topics */}
          <ResizablePanel
            ref={panel1Ref}
            defaultSize={18}
            minSize={5}
            collapsible
            collapsedSize={0}
            className="bg-white border-r border-stone-200"
          >
            <div className="h-full overflow-hidden">
              <TopicsTree
                onSelectFolder={handleSelectFolder}
                selectedFolderId={selectedFolderId}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle
            className="w-1 hover:bg-[#d97757]/50 transition-colors"
            onDragging={setIsResizing}
          />

          {/* Middle Panel: Paper List */}
          <ResizablePanel
            ref={panel2Ref}
            defaultSize={22}
            minSize={10}
            collapsible
            collapsedSize={0}
            className="bg-white border-r border-stone-200"
          >
            <div className="h-full overflow-hidden">
              <PaperList
                papers={[]}
                selectedPaperId={selectedPaperId}
                onSelectPaper={handleSelectPaper}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle
            className="w-1 hover:bg-[#d97757]/50 transition-colors"
            onDragging={setIsResizing}
          />

          {/* Center Panel: PDF Viewer */}
          <ResizablePanel
            ref={panel3Ref}
            defaultSize={35}
            minSize={10}
            collapsible
            collapsedSize={0}
          >
            <div className="h-full w-full flex flex-col bg-stone-100/50 min-w-0 overflow-hidden">
              <PDFViewer />
            </div>
          </ResizablePanel>

          <ResizableHandle
            className="w-1 hover:bg-[#d97757]/50 transition-colors"
            onDragging={setIsResizing}
          />

          {/* Right Panel: Metadata */}
          <ResizablePanel
            ref={panel4Ref}
            defaultSize={25}
            minSize={5}
            collapsible
            collapsedSize={0}
            className="bg-white border-l border-stone-200"
          >
            <div className="h-full overflow-hidden">
              <MetadataPanel
                key={selectedPaperId || 'empty'}
                paper={selectedPaper}
                aiEnabled={aiEnabled}
                onUpdate={handleUpdatePaper}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
