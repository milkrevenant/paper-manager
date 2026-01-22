'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TopicsTree } from '@/components/sidebars/TopicsTree';
import { PaperList } from '@/components/sidebars/PaperList';
import { PDFViewer } from '@/components/main/PDFViewer';
import { MetadataPanel } from '@/components/sidebars/MetadataPanel';
import { Paper } from '@/lib/db/papers';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function DashboardPage() {
  const aiEnabled = useAppStore((state) => state.aiEnabled);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

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
    // In real app: await updatePaper('user-id', selectedPaperId, data);
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
        pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf', // Added demo PDF URL
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
    <div className="h-screen w-full bg-[#faf9f5] overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
            {/* Left Panel: Topics */}
            <ResizablePanel defaultSize={18} minSize={5} className="bg-white border-r border-stone-200">
                <TopicsTree
                    onSelectFolder={handleSelectFolder}
                    selectedFolderId={selectedFolderId}
                />
            </ResizablePanel>

            <ResizableHandle />

            {/* Middle Panel: Paper List */}
            <ResizablePanel defaultSize={22} minSize={10} className="bg-white border-r border-stone-200">
                <PaperList
                    papers={[]}
                    selectedPaperId={selectedPaperId}
                    onSelectPaper={handleSelectPaper}
                />
            </ResizablePanel>

            <ResizableHandle />

            {/* Center Panel: PDF Viewer - collapsible with minSize=0 */}
            <ResizablePanel defaultSize={35} minSize={0} collapsible={true}>
                 <div className="h-full w-full flex flex-col bg-stone-100/50 min-w-0">
                    <PDFViewer />
                 </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Right Panel: Metadata */}
            <ResizablePanel defaultSize={25} minSize={5} className="bg-white border-l border-stone-200">
                <MetadataPanel
                    key={selectedPaperId || 'empty'}
                    paper={selectedPaper}
                    aiEnabled={aiEnabled}
                    onUpdate={handleUpdatePaper}
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    </div>
  );
}
