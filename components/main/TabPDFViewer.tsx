'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { isTauri } from '@/lib/tauri/commands';
import { cn } from '@/lib/utils';

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

export function TabPDFViewer({ selectedPaper }: TabPDFViewerProps) {
  const [tabs, setTabs] = useState<PDFTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});
  const [loadingTabs, setLoadingTabs] = useState<Set<string>>(new Set());

  // Open or focus a paper when selected
  useEffect(() => {
    if (!selectedPaper?.pdfPath) return;

    const existingTab = tabs.find(t => t.id === selectedPaper.id);
    if (existingTab) {
      // Tab already exists, just focus it
      setActiveTabId(existingTab.id);
    } else {
      // Add new tab
      const newTab: PDFTab = {
        id: selectedPaper.id,
        title: selectedPaper.title,
        pdfPath: selectedPaper.pdfPath,
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      loadPdfUrl(newTab.id, selectedPaper.pdfPath);
    }
  }, [selectedPaper?.id, selectedPaper?.pdfPath, selectedPaper?.title]);

  const loadPdfUrl = useCallback(async (tabId: string, pdfPath: string) => {
    if (!isTauri()) return;

    setLoadingTabs(prev => new Set(prev).add(tabId));

    try {
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      const assetUrl = convertFileSrc(pdfPath);
      setDisplayUrls(prev => ({ ...prev, [tabId]: assetUrl }));
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

  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);

      // If closing active tab, switch to adjacent tab
      if (activeTabId === tabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }

      return newTabs;
    });

    // Clean up display URL
    setDisplayUrls(prev => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
  }, [activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeDisplayUrl = activeTabId ? displayUrls[activeTabId] : null;
  const isActiveLoading = activeTabId ? loadingTabs.has(activeTabId) : false;

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

  return (
    <div className="h-full flex flex-col bg-stone-100">
      {/* Tab Bar */}
      <div className="flex bg-white border-b border-stone-200 overflow-x-auto">
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

      {/* PDF Content */}
      <div className="flex-1 relative">
        {isActiveLoading ? (
          <div className="h-full flex items-center justify-center bg-stone-50">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#d97757] mx-auto mb-3 animate-spin" />
              <p className="text-stone-500 text-sm">PDF 로딩 중...</p>
            </div>
          </div>
        ) : activeDisplayUrl ? (
          <iframe
            src={activeDisplayUrl}
            className="w-full h-full border-0"
            title={activeTab?.title || 'PDF Viewer'}
          />
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
    </div>
  );
}
