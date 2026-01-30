'use client';

import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TopBar } from '@/components/layout/TopBar';
import { TopicsTree } from '@/components/sidebars/TopicsTree';
import { PaperList } from '@/components/sidebars/PaperList';
import { PDFViewer } from '@/components/main/PDFViewer';
import { MetadataPanel } from '@/components/sidebars/MetadataPanel';
import { usePapers, useAllPapers, type Paper } from '@/hooks/usePapers';
import { importPdf, isTauri } from '@/lib/tauri/commands';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type PanelImperativeHandle,
} from "@/components/ui/resizable";

export default function DashboardPage() {
  const aiEnabled = useAppStore((state) => state.aiEnabled);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [panelVisibility, setPanelVisibility] = useState({
    panel1: true,
    panel2: true,
    panel3: true,
    panel4: true,
  });

  // Use papers hook
  const { papers, addPaper, editPaper } = usePapers({ folderId: selectedFolderId });
  const { papers: allPapers } = useAllPapers();

  // Handle PDF import
  const handleImportPdfs = useCallback(async (filePaths: string[]) => {
    if (!isTauri()) return;

    setIsImporting(true);
    let lastPaperId: string | null = null;

    try {
      for (const filePath of filePaths) {
        // Extract filename from path
        const filename = filePath.split('/').pop() || filePath.split('\\').pop() || 'paper.pdf';
        const titleFromFilename = filename.replace(/\.pdf$/i, '');

        // Create paper entry
        const paperId = await addPaper({
          folderId: selectedFolderId || 'default',
          title: titleFromFilename,
          pdfFilename: filename,
        });

        // Import PDF file to storage
        const storedPath = await importPdf(filePath, paperId);

        // Update paper with stored path
        await editPaper(paperId, { pdfPath: storedPath });

        lastPaperId = paperId;
      }

      // Auto-select the last imported paper
      if (lastPaperId) {
        setSelectedPaperId(lastPaperId);
      }
    } catch (error) {
      console.error('Failed to import PDFs:', error);
    } finally {
      setIsImporting(false);
    }
  }, [selectedFolderId, addPaper, editPaper]);

  // Panel refs for imperative control
  const panel1Ref = useRef<PanelImperativeHandle>(null);
  const panel2Ref = useRef<PanelImperativeHandle>(null);
  const panel3Ref = useRef<PanelImperativeHandle>(null);
  const panel4Ref = useRef<PanelImperativeHandle>(null);
  const panelGroupRef = useRef<HTMLDivElement>(null);

  const handleSelectFolder = (_topicId: string, folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedPaperId(null);
  };

  const handleSelectPaper = (paperId: string) => {
    setSelectedPaperId(paperId);
  };

  const handleUpdatePaper = async (data: Partial<Paper>) => {
    if (!selectedPaperId) return;
    await editPaper(selectedPaperId, data);
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

    // Add animating class for smooth transition
    panelGroupRef.current?.classList.add('animating');

    if (isCurrentlyVisible) {
      panelRef.current?.collapse();
    } else {
      panelRef.current?.expand();
    }

    setPanelVisibility(prev => ({ ...prev, [panel]: !prev[panel] }));

    // Remove animating class after transition completes
    setTimeout(() => {
      panelGroupRef.current?.classList.remove('animating');
    }, 200);
  };

  // Find selected paper from papers array
  const selectedPaper = selectedPaperId
    ? papers.find((p) => p.id === selectedPaperId) || null
    : null;

  return (
    <div className="h-screen w-full bg-[#faf9f5] overflow-hidden flex flex-col">
      <TopBar panelVisibility={panelVisibility} onTogglePanel={handleTogglePanel} />

      <div ref={panelGroupRef} className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {/* Left Panel: Topics */}
          <ResizablePanel
            ref={panel1Ref}
            defaultSize={18}
            minSize={5}
            collapsible
            collapsedSize={0}
            className="bg-white border-r border-stone-200/70"
          >
            <div className="h-full overflow-hidden">
              <TopicsTree
                onSelectFolder={handleSelectFolder}
                selectedFolderId={selectedFolderId}
                onImportPdfs={handleImportPdfs}
                isImporting={isImporting}
                totalPaperCount={allPapers.length}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Middle Panel: Paper List */}
          <ResizablePanel
            ref={panel2Ref}
            defaultSize={22}
            minSize={10}
            collapsible
            collapsedSize={0}
            className="bg-white border-r border-stone-200/70"
          >
            <div className="h-full overflow-hidden">
              <PaperList
                papers={papers}
                selectedPaperId={selectedPaperId}
                onSelectPaper={handleSelectPaper}
                onImportPdfs={handleImportPdfs}
                isImporting={isImporting}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Center Panel: PDF Viewer */}
          <ResizablePanel
            ref={panel3Ref}
            defaultSize={35}
            minSize={10}
            collapsible
            collapsedSize={0}
            className="border-r border-stone-200/70"
          >
            <div className="h-full w-full flex flex-col bg-stone-100/50 min-w-0 overflow-hidden">
              <PDFViewer pdfUrl={selectedPaper?.pdfPath} />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel: Metadata */}
          <ResizablePanel
            ref={panel4Ref}
            defaultSize={25}
            minSize={5}
            collapsible
            collapsedSize={0}
            className="bg-white"
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
