'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/useAppStore';
import { TopBar } from '@/components/layout/TopBar';
import { TopicsTree } from '@/components/sidebars/TopicsTree';
import { PaperList } from '@/components/sidebars/PaperList';
import { MetadataPanel } from '@/components/sidebars/MetadataPanel';
import { BatchActionsBar } from '@/components/batch/BatchActionsBar';

// Dynamic import to avoid SSR issues with react-pdf (DOMMatrix not defined)
const TabPDFViewer = dynamic(
  () => import('@/components/main/TabPDFViewer').then((mod) => mod.TabPDFViewer),
  { ssr: false }
);
import { PaperSearchDialog } from '@/components/search/PaperSearchDialog';
import { FullTextSearchDialog } from '@/components/search/FullTextSearchDialog';
import { usePapers, useAllPapers, type Paper } from '@/hooks/usePapers';
import { useFolders } from '@/hooks/useFolders';
import {
  importPdf,
  indexPaper,
  isTauri,
  batchUpdatePapers,
  batchDeletePapers,
  exportBibtexBatch,
  exportRisBatch,
} from '@/lib/tauri/commands';
import type { SearchResult } from '@/lib/tauri/types';
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
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [fullTextSearchOpen, setFullTextSearchOpen] = useState(false);
  const [panelVisibility, setPanelVisibility] = useState({
    panel1: true,
    panel2: true,
    panel3: true,
    panel4: true,
  });

  // Use papers hook
  const { papers, addPaper, editPaper, refresh: refreshPapers } = usePapers({ folderId: selectedFolderId });
  const { papers: allPapers, refresh: refreshAllPapers } = useAllPapers();
  const { folders } = useFolders();

  // Extract unique tags from all papers for autocomplete
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allPapers.forEach(paper => {
      paper.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allPapers]);

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

        // Trigger async indexing for full-text search
        indexPaper(paperId).catch(console.error);

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
    setSelectedPaperIds([]);
  };

  const handleSelectPaper = (paperId: string) => {
    setSelectedPaperId(paperId);
  };

  const handleSelectionChange = useCallback((paperIds: string[]) => {
    setSelectedPaperIds(paperIds);
    // Auto-enable selection mode when papers are selected
    if (paperIds.length > 0 && !selectionMode) {
      setSelectionMode(true);
    }
  }, [selectionMode]);

  const handleClearSelection = useCallback(() => {
    setSelectedPaperIds([]);
    setSelectionMode(false);
  }, []);

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

  // Handle adding paper from search results
  const handleAddFromSearch = useCallback(async (searchResult: SearchResult) => {
    if (!isTauri()) return;

    try {
      // Create paper with metadata from search
      const paperId = await addPaper({
        folderId: selectedFolderId || 'default',
        title: searchResult.title,
        author: searchResult.authors.map(a => a.name).join(', '),
        year: searchResult.year || undefined,
      });

      // Select the new paper
      setSelectedPaperId(paperId);
    } catch (error) {
      console.error('Failed to add paper from search:', error);
    }
  }, [selectedFolderId, addPaper]);

  // Handle full-text search result click
  const handleFullTextResult = useCallback((paperId: string, _pageNumber: number) => {
    setSelectedPaperId(paperId);
    // Note: pageNumber can be used later to navigate to specific page
  }, []);

  // Batch operation handlers
  const handleBatchDelete = useCallback(async () => {
    if (!isTauri() || selectedPaperIds.length === 0) return;

    try {
      await batchDeletePapers(selectedPaperIds);
      setSelectedPaperIds([]);
      setSelectionMode(false);
      refreshPapers();
      refreshAllPapers();
    } catch (error) {
      console.error('Failed to delete papers:', error);
      alert('논문 삭제에 실패했습니다.');
    }
  }, [selectedPaperIds, refreshPapers, refreshAllPapers]);

  const handleBatchMoveToFolder = useCallback(async (folderId: string) => {
    if (!isTauri() || selectedPaperIds.length === 0) return;

    try {
      await batchUpdatePapers(selectedPaperIds, { folderId });
      setSelectedPaperIds([]);
      setSelectionMode(false);
      refreshPapers();
      refreshAllPapers();
    } catch (error) {
      console.error('Failed to move papers:', error);
      alert('논문 이동에 실패했습니다.');
    }
  }, [selectedPaperIds, refreshPapers, refreshAllPapers]);

  const handleBatchAddTags = useCallback(async (tags: string[]) => {
    if (!isTauri() || selectedPaperIds.length === 0) return;

    try {
      // Get current tags for each paper and add new tags
      for (const paperId of selectedPaperIds) {
        const paper = papers.find(p => p.id === paperId);
        if (paper) {
          const currentTags = paper.tags || [];
          const newTags = [...new Set([...currentTags, ...tags])];
          await editPaper(paperId, { tags: newTags });
        }
      }
      refreshPapers();
      refreshAllPapers();
    } catch (error) {
      console.error('Failed to add tags:', error);
      alert('태그 추가에 실패했습니다.');
    }
  }, [selectedPaperIds, papers, editPaper, refreshPapers, refreshAllPapers]);

  const handleBatchRemoveTags = useCallback(async (tagsToRemove: string[]) => {
    if (!isTauri() || selectedPaperIds.length === 0) return;

    try {
      for (const paperId of selectedPaperIds) {
        const paper = papers.find(p => p.id === paperId);
        if (paper) {
          const currentTags = paper.tags || [];
          const newTags = currentTags.filter(tag => !tagsToRemove.includes(tag));
          await editPaper(paperId, { tags: newTags });
        }
      }
      refreshPapers();
      refreshAllPapers();
    } catch (error) {
      console.error('Failed to remove tags:', error);
      alert('태그 제거에 실패했습니다.');
    }
  }, [selectedPaperIds, papers, editPaper, refreshPapers, refreshAllPapers]);

  const handleBatchSetImportance = useCallback(async (importance: number) => {
    if (!isTauri() || selectedPaperIds.length === 0) return;

    try {
      await batchUpdatePapers(selectedPaperIds, { importance });
      refreshPapers();
    } catch (error) {
      console.error('Failed to set importance:', error);
      alert('중요도 설정에 실패했습니다.');
    }
  }, [selectedPaperIds, refreshPapers]);

  const handleBatchMarkAsRead = useCallback(async (isRead: boolean) => {
    if (!isTauri() || selectedPaperIds.length === 0) return;

    try {
      await batchUpdatePapers(selectedPaperIds, { isRead });
      refreshPapers();
    } catch (error) {
      console.error('Failed to mark as read:', error);
      alert('읽음 상태 변경에 실패했습니다.');
    }
  }, [selectedPaperIds, refreshPapers]);

  const handleBatchExportCitations = useCallback(async (format: 'bibtex' | 'ris') => {
    if (!isTauri() || selectedPaperIds.length === 0) return;

    try {
      const result = format === 'bibtex'
        ? await exportBibtexBatch(selectedPaperIds)
        : await exportRisBatch(selectedPaperIds);

      // Copy to clipboard
      await navigator.clipboard.writeText(result.content);
      alert(`${result.paperCount}개 논문의 ${format.toUpperCase()} 인용이 클립보드에 복사되었습니다.`);
    } catch (error) {
      console.error('Failed to export citations:', error);
      alert('인용 내보내기에 실패했습니다.');
    }
  }, [selectedPaperIds]);

  // Find selected paper from papers array
  const selectedPaper = selectedPaperId
    ? papers.find((p) => p.id === selectedPaperId) || null
    : null;

  return (
    <div className="h-screen w-full bg-[#faf9f5] overflow-hidden flex flex-col">
      <TopBar
        panelVisibility={panelVisibility}
        onTogglePanel={handleTogglePanel}
        onSearchClick={() => setSearchDialogOpen(true)}
        onFullTextSearchClick={() => setFullTextSearchOpen(true)}
        selectionMode={selectionMode}
        onToggleSelectionMode={() => {
          setSelectionMode(!selectionMode);
          if (selectionMode) {
            setSelectedPaperIds([]);
          }
        }}
      />

      <PaperSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onAddPaper={handleAddFromSearch}
      />

      <FullTextSearchDialog
        open={fullTextSearchOpen}
        onOpenChange={setFullTextSearchOpen}
        onSelectResult={handleFullTextResult}
        folderId={selectedFolderId}
      />

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
                allPapers={allPapers}
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
                selectedPaperIds={selectedPaperIds}
                onSelectPaper={handleSelectPaper}
                onSelectionChange={handleSelectionChange}
                onImportPdfs={handleImportPdfs}
                isImporting={isImporting}
                selectionMode={selectionMode}
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
              <TabPDFViewer selectedPaper={selectedPaper} />
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
                allTags={allTags}
                onUpdate={handleUpdatePaper}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Batch Actions Bar */}
      <BatchActionsBar
        selectedCount={selectedPaperIds.length}
        selectedPaperIds={selectedPaperIds}
        folders={folders}
        allTags={allTags}
        onClearSelection={handleClearSelection}
        onDelete={handleBatchDelete}
        onMoveToFolder={handleBatchMoveToFolder}
        onAddTags={handleBatchAddTags}
        onRemoveTags={handleBatchRemoveTags}
        onSetImportance={handleBatchSetImportance}
        onMarkAsRead={handleBatchMarkAsRead}
        onExportCitations={handleBatchExportCitations}
      />
    </div>
  );
}
