'use client';
import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

import { Star, Plus, Upload } from 'lucide-react';
import { isTauri, openPdfDialog } from '@/lib/tauri/commands';
import type { Paper } from '@/lib/tauri/types';
import { Button } from '@/components/ui/button';

interface PaperListProps {
  papers: Paper[];
  selectedPaperId: string | null;
  onSelectPaper: (paperId: string) => void;
  onImportPdfs?: (filePaths: string[]) => Promise<void>;
  isImporting?: boolean;
}

export function PaperList({
  papers,
  selectedPaperId,
  onSelectPaper,
  onImportPdfs,
  isImporting = false,
}: PaperListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Listen for Tauri file drop events
  useEffect(() => {
    if (!isTauri()) return;

    const unlistenDrop = listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
      const pdfPaths = event.payload.paths.filter((p) => p.toLowerCase().endsWith('.pdf'));
      if (pdfPaths.length > 0 && onImportPdfs) {
        onImportPdfs(pdfPaths);
      }
      setIsDragging(false);
      setDragCounter(0);
    });

    const unlistenEnter = listen('tauri://drag-enter', () => {
      setIsDragging(true);
    });

    const unlistenLeave = listen('tauri://drag-leave', () => {
      setIsDragging(false);
    });

    return () => {
      unlistenDrop.then((fn) => fn());
      unlistenEnter.then((fn) => fn());
      unlistenLeave.then((fn) => fn());
    };
  }, [onImportPdfs]);

  const handleFileButtonClick = async () => {
    if (!isTauri() || !onImportPdfs) return;

    const paths = await openPdfDialog();
    if (paths && paths.length > 0) {
      await onImportPdfs(paths);
    }
  };

  // Handle web drag & drop (for non-Tauri environments)
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => c + 1);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => {
      const newCount = c - 1;
      if (newCount === 0) setIsDragging(false);
      return newCount;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCounter(0);
    // Web file drop is not supported for now (need File API handling)
  };

  // Demo papers
  const demoPapers: Partial<Paper>[] = [
    {
      id: '1',
      paperNumber: 1,
      title: 'Deep Learning Approaches for Natural Language Processing',
      author: 'Smith, J.',
      year: 2024,
      publisher: 'Nature AI',
      importance: 5,
      lastAnalyzedAt: new Date().toISOString(),
    },
    {
      id: '2',
      paperNumber: 2,
      title: 'A Survey of Machine Learning Techniques',
      author: 'Johnson, K.',
      year: 2023,
      publisher: 'IEEE Transactions',
      importance: 4,
    },
    {
      id: '3',
      paperNumber: 3,
      title: 'Recent Advances in Computer Vision',
      author: 'Lee, M.',
      year: 2024,
      publisher: 'CVPR',
      importance: 3,
      lastAnalyzedAt: new Date().toISOString(),
    },
  ];

  const allPapers = papers.length > 0 ? papers : demoPapers;
  
  const filteredPapers = allPapers.filter(paper => 
    paper.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    paper.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="h-full flex flex-col bg-white relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Hint Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#d97757]/10 border-2 border-dashed border-[#d97757] flex items-center justify-center backdrop-blur-sm">
          <div className="text-[#d97757] font-bold text-lg flex flex-col items-center gap-2">
            <Upload className="w-8 h-8" />
            <span>PDF 파일을 여기에 드롭하세요</span>
          </div>
        </div>
      )}

      {/* Importing Overlay */}
      {isImporting && (
        <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center backdrop-blur-sm">
          <div className="text-stone-600 font-medium text-sm flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#d97757] border-t-transparent rounded-full animate-spin" />
            <span>PDF 가져오는 중...</span>
          </div>
        </div>
      )}

      {/* Search Header (Sticky) */}
      <div className="py-2 px-3 border-b border-stone-200 bg-white sticky top-0 z-10 min-h-[60px] flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목, 저자 검색..."
            className="w-full pl-9 pr-12 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-stone-400"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-display text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
            {filteredPapers.length}
          </span>
        </div>
        {onImportPdfs && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleFileButtonClick}
            disabled={isImporting}
            className="h-9 px-2.5 border-stone-200 hover:bg-[#d97757]/10 hover:border-[#d97757] hover:text-[#d97757] transition-colors"
            title="PDF 추가"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Table Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-2 text-xs font-semibold text-stone-500 flex items-center gap-3 font-sans uppercase tracking-wider sticky top-[61px] z-10 overflow-hidden">
        <div className="w-8 flex-shrink-0 text-center">No.</div>
        <div className="flex-1 min-w-0 truncate">Title</div>
        <div className="w-24 flex-shrink-0 truncate">Author</div>
        <div className="w-14 flex-shrink-0">Year</div>
        <div className="w-16 flex-shrink-0 text-center">Rate</div>
      </div>

      {/* Papers */}
      <div className="flex-1 overflow-auto">
        {filteredPapers.map((paper) => (
          <div
            key={paper.id}
            onClick={() => onSelectPaper(paper.id!)}
            className={`px-4 py-3 border-b border-stone-100 cursor-pointer flex items-center gap-3 transition-all ${
              selectedPaperId === paper.id
                ? 'bg-[#f2f0e9] border-l-4 border-l-[#d97757] pl-3'
                : 'hover:bg-stone-50 border-l-4 border-l-transparent pl-3'
            }`}
          >
            {/* No. - with file indicator */}
            <div className={`w-8 flex-shrink-0 text-xs font-display font-medium text-center py-0.5 rounded ${
              paper.lastAnalyzedAt
                ? 'bg-[#d97757]/10 text-[#d97757]'
                : 'text-stone-400'
            }`}>
              {paper.paperNumber}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-stone-900 truncate font-sans">
                {paper.title}
              </div>
              {paper.publisher && (
                <div className="text-xs text-stone-500 truncate mt-0.5 font-sans">{paper.publisher}</div>
              )}
            </div>

            {/* Author */}
            <div className="w-24 flex-shrink-0 text-xs text-stone-600 truncate font-sans">
              {paper.author}
            </div>

            {/* Year */}
            <div className="w-14 flex-shrink-0 text-xs font-display text-stone-500">
              {paper.year}
            </div>

            {/* Importance */}
            <div className="w-16 flex-shrink-0 flex items-center justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < (paper.importance || 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-stone-200'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
        {filteredPapers.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-sm">
                검색 결과가 없습니다.
            </div>
        )}
      </div>
    </div>
  );
}
