'use client';
import { useState } from 'react';

import { Paperclip, Star } from 'lucide-react';
import { Paper } from '@/lib/db/papers';

interface PaperListProps {
  papers: Paper[];
  selectedPaperId: string | null;
  onSelectPaper: (paperId: string) => void;
}

export function PaperList({ papers, selectedPaperId, onSelectPaper }: PaperListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

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
      lastAnalyzedAt: new Date(),
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
      lastAnalyzedAt: new Date(),
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
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        // Handle drop logic here later
      }}
    >
      {/* Drag Hint Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#d97757]/10 border-2 border-dashed border-[#d97757] flex items-center justify-center backdrop-blur-sm">
          <div className="text-[#d97757] font-bold text-lg flex flex-col items-center gap-2">
            <Paperclip className="w-8 h-8" />
            <span>Drop papers to import</span>
          </div>
        </div>
      )}

      {/* Search Header (Sticky) */}
      <div className="p-3 border-b border-stone-200 bg-white sticky top-0 z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-800 font-sans tracking-tight">논문 목록</h2>
            <span className="text-xs font-display text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                {filteredPapers.length}
            </span>
        </div>
        <div className="relative">
             <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 저자 검색..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-stone-400"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 text-xs font-semibold text-stone-500 flex items-center gap-3 font-sans uppercase tracking-wider sticky top-[85px] z-10">
        <div className="w-8 flex-shrink-0"></div>
        <div className="w-8 flex-shrink-0 text-center">No.</div>
        <div className="flex-1 min-w-0">Title</div>
        <div className="w-24 flex-shrink-0">Author</div>
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
            {/* Icons */}
            <div className="w-8 flex-shrink-0 flex items-center gap-1.5">
              {paper.lastAnalyzedAt && (
                <div className="group relative">
                  <div className="p-1 bg-green-50 rounded text-green-700">
                    <Paperclip className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>

            {/* No. */}
            <div className="w-8 flex-shrink-0 text-xs font-display text-stone-400 font-medium text-center">
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
