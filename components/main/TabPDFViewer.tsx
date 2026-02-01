'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Maximize2,
  Rows3,
  Square,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { isTauri, summarizeText, translateText } from '@/lib/tauri/commands';
import { cn } from '@/lib/utils';
import { useHighlights } from '@/hooks/useHighlights';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import { HighlightLayer } from '@/components/pdf/HighlightLayer';
import { HighlightPopup } from '@/components/pdf/HighlightPopup';
import { PDFContextMenu } from '@/components/pdf/PDFContextMenu';
import { AIResultPopup } from '@/components/pdf/AIResultPopup';
import type { Highlight, HighlightRect, CreateHighlightInput } from '@/lib/tauri/types';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFTab {
  id: string;
  title: string;
  pdfPath: string;
}

interface TabPDFViewerProps {
  selectedPaper?: {
    id: string;
    title: string;
    pdfPath?: string;
  } | null;
}

interface SelectionPopup {
  x: number;
  y: number;
  rects: HighlightRect[];
  text: string;
  pageNumber: number;
}

interface EditingHighlight {
  highlight: Highlight;
  x: number;
  y: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  selectedText: string;
  pageNumber: number;
}

interface AIPopupState {
  x: number;
  y: number;
  type: 'summary' | 'translation';
  originalText: string;
  result: string;
  isLoading: boolean;
  error: string | null;
  targetLang: string;
}

type ViewMode = 'single' | 'continuous';
type FitMode = 'none' | 'width';

export function TabPDFViewer({ selectedPaper }: TabPDFViewerProps) {
  const [tabs, setTabs] = useState<PDFTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});
  const [loadingTabs, setLoadingTabs] = useState<Set<string>>(new Set());

  // PDF state per tab
  const [numPages, setNumPages] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
  const [scale, setScale] = useState<Record<string, number>>({});
  const [pageWidths, setPageWidths] = useState<Record<string, number>>({});

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('continuous');
  const [fitMode, setFitMode] = useState<FitMode>('width');

  // Highlight state
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null);
  const [editingHighlight, setEditingHighlight] = useState<EditingHighlight | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // AI popup state
  const [aiPopup, setAiPopup] = useState<AIPopupState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track container width for fit-to-width
  const containerWidth = useContainerWidth(scrollContainerRef);

  // Use highlights hook
  const { highlights, addHighlight, editHighlight, removeHighlight } = useHighlights({
    paperId: activeTabId,
  });

  // Calculate effective scale based on fit mode
  const effectiveScale = useMemo(() => {
    if (!activeTabId) return 1.0;

    const baseScale = scale[activeTabId] || 1.0;

    if (fitMode === 'width' && containerWidth > 0 && pageWidths[activeTabId]) {
      // Calculate scale to fit page width to container (with padding)
      const padding = 48; // 24px on each side
      const fitWidthScale = (containerWidth - padding) / pageWidths[activeTabId];
      return Math.min(fitWidthScale, 3.0); // Cap at 3x
    }

    return baseScale;
  }, [activeTabId, scale, fitMode, containerWidth, pageWidths]);

  // Load PDF URL helper
  const loadPdfUrl = useCallback(async (tabId: string, pdfPath: string) => {
    if (!isTauri()) return;

    setLoadingTabs(prev => new Set(prev).add(tabId));

    try {
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      const assetUrl = convertFileSrc(pdfPath);
      setDisplayUrls(prev => ({ ...prev, [tabId]: assetUrl }));
      // Initialize page and scale
      setCurrentPage(prev => ({ ...prev, [tabId]: 1 }));
      setScale(prev => ({ ...prev, [tabId]: 1.0 }));
    } catch (err) {
      console.error('Failed to load PDF:', err);
    } finally {
      setLoadingTabs(prev => {
        const next = new Set(prev);
        next.delete(tabId);
        return next;
      });
    }
  }, []);

  // Open or focus a paper when selected
  useEffect(() => {
    if (!selectedPaper?.pdfPath) return;

    setTabs(prevTabs => {
      const existingTab = prevTabs.find(t => t.id === selectedPaper.id);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return prevTabs;
      } else {
        const newTab: PDFTab = {
          id: selectedPaper.id,
          title: selectedPaper.title,
          pdfPath: selectedPaper.pdfPath,
        };
        setActiveTabId(newTab.id);
        loadPdfUrl(newTab.id, selectedPaper.pdfPath);
        return [...prevTabs, newTab];
      }
    });
  }, [selectedPaper?.id, selectedPaper?.pdfPath, selectedPaper?.title, loadPdfUrl]);

  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);

      if (activeTabId === tabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }

      return newTabs;
    });

    // Clean up state for closed tab
    setDisplayUrls(prev => { const next = { ...prev }; delete next[tabId]; return next; });
    setNumPages(prev => { const next = { ...prev }; delete next[tabId]; return next; });
    setCurrentPage(prev => { const next = { ...prev }; delete next[tabId]; return next; });
    setScale(prev => { const next = { ...prev }; delete next[tabId]; return next; });
    setPageWidths(prev => { const next = { ...prev }; delete next[tabId]; return next; });
  }, [activeTabId]);

  const onDocumentLoadSuccess = useCallback((tabId: string, { numPages: pages }: { numPages: number }) => {
    setNumPages(prev => ({ ...prev, [tabId]: pages }));
  }, []);

  // Capture page width on first page load
  const onPageLoadSuccess = useCallback((tabId: string, page: { originalWidth: number }) => {
    setPageWidths(prev => {
      if (!prev[tabId]) {
        return { ...prev, [tabId]: page.originalWidth };
      }
      return prev;
    });
  }, []);

  const goToPage = useCallback((tabId: string, page: number) => {
    const pages = numPages[tabId] || 1;
    if (page >= 1 && page <= pages) {
      setCurrentPage(prev => ({ ...prev, [tabId]: page }));

      // In continuous mode, scroll to the page
      if (viewMode === 'continuous') {
        const pageElement = pageContainerRefs.current.get(page);
        if (pageElement && scrollContainerRef.current) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, [numPages, viewMode]);

  const changeScale = useCallback((tabId: string, delta: number) => {
    // Switch off fit mode when manually changing scale
    setFitMode('none');
    setScale(prev => {
      const current = prev[tabId] || 1.0;
      const newScale = Math.max(0.5, Math.min(3.0, current + delta));
      return { ...prev, [tabId]: newScale };
    });
  }, []);

  const toggleFitWidth = useCallback(() => {
    setFitMode(prev => prev === 'width' ? 'none' : 'width');
  }, []);

  // Handle scroll for continuous mode - detect current page
  const handleScroll = useCallback(() => {
    if (viewMode !== 'continuous' || !activeTabId || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    // Find the page that is most visible in the center
    let closestPage = 1;
    let closestDistance = Infinity;

    pageContainerRefs.current.forEach((element, pageNum) => {
      const rect = element.getBoundingClientRect();
      const pageCenter = rect.top + rect.height / 2;
      const distance = Math.abs(pageCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = pageNum;
      }
    });

    setCurrentPage(prev => {
      if (prev[activeTabId] !== closestPage) {
        return { ...prev, [activeTabId]: closestPage };
      }
      return prev;
    });
  }, [viewMode, activeTabId]);

  // Get page container ref for a specific page
  const getPageContainerRef = useCallback((pageNum: number) => (el: HTMLDivElement | null) => {
    if (el) {
      pageContainerRefs.current.set(pageNum, el);
    } else {
      pageContainerRefs.current.delete(pageNum);
    }
  }, []);

  // Handle text selection for highlighting (in highlight mode)
  const handleMouseUp = useCallback((pageNumber: number) => {
    if (!highlightMode || !activeTabId) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    const pageContainer = pageContainerRefs.current.get(pageNumber);
    if (!pageContainer) return;

    const range = selection.getRangeAt(0);
    const pageRect = pageContainer.getBoundingClientRect();
    const clientRects = range.getClientRects();

    if (clientRects.length === 0) return;

    // Convert to percentage-based coordinates
    const rects: HighlightRect[] = Array.from(clientRects).map(rect => ({
      top: ((rect.top - pageRect.top) / pageRect.height) * 100,
      left: ((rect.left - pageRect.left) / pageRect.width) * 100,
      width: (rect.width / pageRect.width) * 100,
      height: (rect.height / pageRect.height) * 100,
    }));

    // Get popup position
    const lastRect = clientRects[clientRects.length - 1];
    setSelectionPopup({
      x: lastRect.right,
      y: lastRect.bottom,
      rects,
      text,
      pageNumber,
    });
  }, [highlightMode, activeTabId]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, pageNumber: number) => {
    e.preventDefault();

    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      selectedText: text,
      pageNumber,
    });
  }, []);

  // Create highlight from selection
  const handleCreateHighlight = useCallback(async (color: string, note: string) => {
    if (!selectionPopup || !activeTabId) return;

    const input: CreateHighlightInput = {
      paperId: activeTabId,
      pageNumber: selectionPopup.pageNumber,
      rects: selectionPopup.rects,
      selectedText: selectionPopup.text,
      color,
      note: note || undefined,
    };

    try {
      await addHighlight(input);
      window.getSelection()?.removeAllRanges();
      setSelectionPopup(null);
    } catch (err) {
      console.error('Failed to create highlight:', err);
    }
  }, [selectionPopup, activeTabId, addHighlight]);

  // Create highlight from context menu
  const handleHighlightFromContext = useCallback(() => {
    if (!contextMenu || !contextMenu.selectedText || !activeTabId) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const pageContainer = pageContainerRefs.current.get(contextMenu.pageNumber);
    if (!pageContainer) return;

    const range = selection.getRangeAt(0);
    const pageRect = pageContainer.getBoundingClientRect();
    const clientRects = range.getClientRects();

    if (clientRects.length === 0) return;

    const rects: HighlightRect[] = Array.from(clientRects).map(rect => ({
      top: ((rect.top - pageRect.top) / pageRect.height) * 100,
      left: ((rect.left - pageRect.left) / pageRect.width) * 100,
      width: (rect.width / pageRect.width) * 100,
      height: (rect.height / pageRect.height) * 100,
    }));

    const lastRect = clientRects[clientRects.length - 1];
    setSelectionPopup({
      x: lastRect.right,
      y: lastRect.bottom,
      rects,
      text: contextMenu.selectedText,
      pageNumber: contextMenu.pageNumber,
    });
  }, [contextMenu, activeTabId]);

  // Edit existing highlight
  const handleEditHighlight = useCallback(async (color: string, note: string) => {
    if (!editingHighlight) return;

    try {
      await editHighlight(editingHighlight.highlight.id, { color, note });
      setEditingHighlight(null);
    } catch (err) {
      console.error('Failed to edit highlight:', err);
    }
  }, [editingHighlight, editHighlight]);

  // Delete highlight
  const handleDeleteHighlight = useCallback(async () => {
    if (!editingHighlight) return;

    try {
      await removeHighlight(editingHighlight.highlight.id);
      setEditingHighlight(null);
    } catch (err) {
      console.error('Failed to delete highlight:', err);
    }
  }, [editingHighlight, removeHighlight]);

  // Handle highlight click for editing
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    const pageContainer = pageContainerRefs.current.get(highlight.pageNumber);
    if (highlight.rects.length > 0 && pageContainer) {
      const pageRect = pageContainer.getBoundingClientRect();
      const rect = highlight.rects[0];
      setEditingHighlight({
        highlight,
        x: pageRect.left + (rect.left / 100) * pageRect.width,
        y: pageRect.top + (rect.top / 100) * pageRect.height,
      });
    }
  }, []);

  // AI Summary
  const handleAISummary = useCallback(async () => {
    if (!contextMenu?.selectedText) return;

    setAiPopup({
      x: contextMenu.x,
      y: contextMenu.y,
      type: 'summary',
      originalText: contextMenu.selectedText,
      result: '',
      isLoading: true,
      error: null,
      targetLang: 'ko',
    });

    try {
      const result = await summarizeText(contextMenu.selectedText);
      setAiPopup(prev => prev ? { ...prev, result, isLoading: false } : null);
    } catch (err) {
      setAiPopup(prev => prev ? {
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'AI 요약 중 오류가 발생했습니다.',
      } : null);
    }
  }, [contextMenu]);

  // AI Translation
  const handleAITranslate = useCallback(async (targetLang: string = 'en') => {
    if (!contextMenu?.selectedText) return;

    setAiPopup({
      x: contextMenu.x,
      y: contextMenu.y,
      type: 'translation',
      originalText: contextMenu.selectedText,
      result: '',
      isLoading: true,
      error: null,
      targetLang,
    });

    try {
      const result = await translateText(contextMenu.selectedText, targetLang);
      setAiPopup(prev => prev ? { ...prev, result, isLoading: false } : null);
    } catch (err) {
      setAiPopup(prev => prev ? {
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'AI 번역 중 오류가 발생했습니다.',
      } : null);
    }
  }, [contextMenu]);

  // Change target language and re-translate
  const handleTargetLangChange = useCallback(async (newLang: string) => {
    if (!aiPopup || aiPopup.type !== 'translation') return;

    setAiPopup(prev => prev ? { ...prev, targetLang: newLang, isLoading: true, error: null } : null);

    try {
      const result = await translateText(aiPopup.originalText, newLang);
      setAiPopup(prev => prev ? { ...prev, result, isLoading: false } : null);
    } catch (err) {
      setAiPopup(prev => prev ? {
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'AI 번역 중 오류가 발생했습니다.',
      } : null);
    }
  }, [aiPopup]);

  // Add note (opens highlight popup without color selection first)
  const handleAddNote = useCallback(() => {
    if (!contextMenu?.selectedText) return;
    // Reuse highlight flow - user can add a note via highlight
    handleHighlightFromContext();
  }, [contextMenu, handleHighlightFromContext]);

  // Copy text
  const handleCopyText = useCallback(async () => {
    if (!contextMenu?.selectedText) return;

    try {
      await navigator.clipboard.writeText(contextMenu.selectedText);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }, [contextMenu]);

  // Copy AI result
  const handleCopyAIResult = useCallback(async () => {
    if (!aiPopup?.result) return;

    try {
      await navigator.clipboard.writeText(aiPopup.result);
    } catch (err) {
      console.error('Failed to copy AI result:', err);
    }
  }, [aiPopup]);

  // Save AI result as note
  const handleSaveAsNote = useCallback(async () => {
    if (!aiPopup?.result || !activeTabId) return;

    // Create a highlight with the AI result as note
    // For now, we'll just copy to clipboard with a message
    try {
      const noteText = aiPopup.type === 'summary'
        ? `[AI 요약]\n${aiPopup.result}\n\n[원문]\n${aiPopup.originalText}`
        : `[AI 번역]\n${aiPopup.result}\n\n[원문]\n${aiPopup.originalText}`;

      await navigator.clipboard.writeText(noteText);
      alert('메모가 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('Failed to save as note:', err);
    }
  }, [aiPopup, activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeDisplayUrl = activeTabId ? displayUrls[activeTabId] : null;
  const isActiveLoading = activeTabId ? loadingTabs.has(activeTabId) : false;
  const activeNumPages = activeTabId ? numPages[activeTabId] || 0 : 0;
  const activeCurrentPage = activeTabId ? currentPage[activeTabId] || 1 : 1;

  // Empty state
  if (tabs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">논문을 선택하세요</p>
          <p className="text-sm text-stone-400 mt-1">PDF가 여기에 표시됩니다</p>
        </div>
      </div>
    );
  }

  // Render a single page with highlight layer
  const renderPage = (pageNum: number, isOnlyPage: boolean = false) => (
    <div
      key={pageNum}
      ref={getPageContainerRef(pageNum)}
      className="relative"
      data-page={pageNum}
      onMouseUp={() => handleMouseUp(pageNum)}
      onContextMenu={(e) => handleContextMenu(e, pageNum)}
    >
      <HighlightLayer
        pageNumber={pageNum}
        highlights={highlights}
        onHighlightClick={handleHighlightClick}
      />
      <Page
        pageNumber={pageNum}
        scale={effectiveScale}
        renderTextLayer={true}
        renderAnnotationLayer={true}
        className="pdf-page shadow-lg"
        onLoadSuccess={isOnlyPage || pageNum === 1
          ? (page) => activeTabId && onPageLoadSuccess(activeTabId, page)
          : undefined
        }
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-stone-100">
      {/* Tab Bar */}
      <div className="flex bg-white border-b border-stone-200 overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 border-r border-stone-200 cursor-pointer min-w-[120px] max-w-[200px] group",
              activeTabId === tab.id
                ? "bg-stone-50 border-b-2 border-b-[#d97757]"
                : "hover:bg-stone-50"
            )}
          >
            <FileText className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <span className="text-sm text-stone-700 truncate flex-1">
              {tab.title}
            </span>
            <button
              onClick={(e) => closeTab(tab.id, e)}
              className="p-0.5 rounded hover:bg-stone-200 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-stone-500" />
            </button>
          </div>
        ))}
      </div>

      {/* PDF Toolbar */}
      {activeDisplayUrl && !isActiveLoading && (
        <div className="flex items-center justify-center gap-4 px-4 py-2 bg-white border-b border-stone-200 shrink-0">
          {/* Highlight Mode Toggle */}
          <button
            onClick={() => setHighlightMode(!highlightMode)}
            className={cn(
              "p-1.5 rounded transition-colors",
              highlightMode
                ? "bg-yellow-100 text-yellow-700"
                : "hover:bg-stone-100 text-stone-600"
            )}
            title={highlightMode ? "하이라이트 모드 끄기" : "하이라이트 모드 켜기"}
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-stone-200" />

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(prev => prev === 'single' ? 'continuous' : 'single')}
            className={cn(
              "p-1.5 rounded transition-colors hover:bg-stone-100 text-stone-600"
            )}
            title={viewMode === 'single' ? "연속 스크롤" : "단일 페이지"}
          >
            {viewMode === 'single' ? <Rows3 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>

          <div className="w-px h-5 bg-stone-200" />

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => activeTabId && goToPage(activeTabId, activeCurrentPage - 1)}
              disabled={activeCurrentPage <= 1}
              className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-stone-600 min-w-[80px] text-center">
              {activeCurrentPage} / {activeNumPages}
            </span>
            <button
              onClick={() => activeTabId && goToPage(activeTabId, activeCurrentPage + 1)}
              disabled={activeCurrentPage >= activeNumPages}
              className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-5 bg-stone-200" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => activeTabId && changeScale(activeTabId, -0.25)}
              disabled={effectiveScale <= 0.5}
              className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-stone-600 min-w-[60px] text-center">
              {fitMode === 'width' ? '폭맞춤' : `${Math.round(effectiveScale * 100)}%`}
            </span>
            <button
              onClick={() => activeTabId && changeScale(activeTabId, 0.25)}
              disabled={effectiveScale >= 3.0}
              className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Fit to Width Toggle */}
          <button
            onClick={toggleFitWidth}
            className={cn(
              "p-1.5 rounded transition-colors",
              fitMode === 'width'
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-stone-100 text-stone-600"
            )}
            title="폭에 맞춤"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PDF Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
        onScroll={handleScroll}
      >
        {isActiveLoading ? (
          <div className="h-full flex items-center justify-center bg-stone-50">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#d97757] mx-auto mb-3 animate-spin" />
              <p className="text-stone-500 text-sm">PDF 로딩 중...</p>
            </div>
          </div>
        ) : activeDisplayUrl ? (
          <div className="flex justify-center p-4">
            <Document
              file={activeDisplayUrl}
              onLoadSuccess={(pdf) => activeTabId && onDocumentLoadSuccess(activeTabId, pdf)}
              loading={
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 text-[#d97757] animate-spin" />
                </div>
              }
              error={
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-red-300 mx-auto mb-4" />
                  <p className="text-red-500 font-medium">PDF를 불러올 수 없습니다</p>
                  <p className="text-sm text-stone-400 mt-1">파일 경로: {activeTab?.pdfPath}</p>
                </div>
              }
              className="pdf-document"
            >
              {viewMode === 'continuous' ? (
                // Continuous scroll mode - render all pages
                <div className="flex flex-col gap-4">
                  {Array.from({ length: activeNumPages }, (_, i) => renderPage(i + 1))}
                </div>
              ) : (
                // Single page mode
                renderPage(activeCurrentPage, true)
              )}
            </Document>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-stone-50">
            <div className="text-center">
              <FileText className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <p className="text-red-500 font-medium">PDF를 불러올 수 없습니다</p>
              <p className="text-sm text-stone-400 mt-1">파일 경로: {activeTab?.pdfPath}</p>
            </div>
          </div>
        )}
      </div>

      {/* Selection Popup for creating highlight */}
      {selectionPopup && (
        <HighlightPopup
          x={selectionPopup.x}
          y={selectionPopup.y}
          selectedText={selectionPopup.text}
          onHighlight={handleCreateHighlight}
          onCancel={() => {
            setSelectionPopup(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {/* Edit Popup for existing highlight */}
      {editingHighlight && (
        <HighlightPopup
          x={editingHighlight.x}
          y={editingHighlight.y}
          selectedText={editingHighlight.highlight.selectedText}
          initialColor={editingHighlight.highlight.color}
          initialNote={editingHighlight.highlight.note}
          isEditing={true}
          onHighlight={handleEditHighlight}
          onDelete={handleDeleteHighlight}
          onCancel={() => setEditingHighlight(null)}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <PDFContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          hasSelection={!!contextMenu.selectedText}
          onHighlight={handleHighlightFromContext}
          onAISummary={handleAISummary}
          onAITranslate={() => handleAITranslate('en')}
          onAddNote={handleAddNote}
          onCopyText={handleCopyText}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* AI Result Popup */}
      {aiPopup && (
        <AIResultPopup
          x={aiPopup.x}
          y={aiPopup.y}
          type={aiPopup.type}
          originalText={aiPopup.originalText}
          result={aiPopup.result}
          isLoading={aiPopup.isLoading}
          error={aiPopup.error}
          targetLang={aiPopup.targetLang}
          onTargetLangChange={handleTargetLangChange}
          onCopy={handleCopyAIResult}
          onSaveAsNote={handleSaveAsNote}
          onClose={() => setAiPopup(null)}
        />
      )}
    </div>
  );
}
