'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Loader2,
  FileText,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { searchFullText, isTauri } from '@/lib/tauri/commands';
import type { FullTextSearchResult, FullTextSearchQuery } from '@/lib/tauri/types';
import { cn } from '@/lib/utils';

interface FullTextSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult?: (paperId: string, pageNumber: number) => void;
  folderId?: string | null;
}

export function FullTextSearchDialog({
  open,
  onOpenChange,
  onSelectResult,
  folderId,
}: FullTextSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FullTextSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !isTauri()) return;

    setLoading(true);
    setSearched(true);

    try {
      const searchQuery: FullTextSearchQuery = {
        query: query.trim(),
        limit: 50,
        offset: 0,
        folderId: folderId || undefined,
      };

      const response = await searchFullText(searchQuery);
      setResults(response.results);
      setTotal(response.total);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, folderId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleResultClick = (result: FullTextSearchResult) => {
    onSelectResult?.(result.paperId, result.pageNumber);
    onOpenChange(false);
  };

  // Parse snippet to highlight matches
  const renderSnippet = (snippet: string) => {
    const parts = snippet.split(/(<mark>|<\/mark>)/);
    let inMark = false;

    return parts.map((part, i) => {
      if (part === '<mark>') {
        inMark = true;
        return null;
      }
      if (part === '</mark>') {
        inMark = false;
        return null;
      }
      return (
        <span
          key={i}
          className={cn(
            inMark && 'bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded'
          )}
        >
          {part}
        </span>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Search className="w-5 h-5" />
            PDF 전문 검색
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex gap-2 pb-3 border-b border-stone-200">
          <Input
            placeholder="PDF 내용에서 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            autoFocus
          />
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            검색
          </Button>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            </div>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <BookOpen className="w-12 h-12 mb-3" />
              <p className="text-sm">검색어를 입력하세요</p>
              <p className="text-xs mt-1">PDF 내용에서 텍스트를 찾습니다</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <FileText className="w-12 h-12 mb-3" />
              <p className="text-sm">검색 결과가 없습니다</p>
              <p className="text-xs mt-1">다른 검색어를 시도하거나 PDF를 먼저 인덱싱하세요</p>
            </div>
          ) : (
            <div className="space-y-1 py-2">
              <p className="text-xs text-stone-400 px-1 mb-2">
                {total.toLocaleString()}개 결과
              </p>

              {results.map((result, idx) => (
                <button
                  key={`${result.paperId}-${result.pageNumber}-${idx}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full p-3 rounded-lg border border-stone-200 hover:border-stone-300 bg-white transition-colors text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Paper Title */}
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <h4 className="font-medium text-stone-800 text-sm truncate">
                          {result.paperTitle}
                        </h4>
                      </div>

                      {/* Page number */}
                      <div className="text-xs text-stone-500 mt-1">
                        {result.paperAuthor && `${result.paperAuthor} · `}
                        페이지 {result.pageNumber}
                      </div>

                      {/* Snippet */}
                      <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                        {renderSnippet(result.snippet)}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
