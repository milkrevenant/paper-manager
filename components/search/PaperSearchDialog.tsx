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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Loader2,
  ExternalLink,
  Plus,
  FileText,
  Users,
  Calendar,
  Quote,
  BookOpen,
} from 'lucide-react';
import { searchPapers, isTauri } from '@/lib/tauri/commands';
import type { SearchResult, SearchQuery } from '@/lib/tauri/types';
import { cn } from '@/lib/utils';

interface PaperSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPaper?: (paper: SearchResult) => void;
}

const fieldsOfStudy = [
  { value: 'all', label: 'All Fields' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Medicine', label: 'Medicine' },
  { value: 'Biology', label: 'Biology' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Psychology', label: 'Psychology' },
  { value: 'Economics', label: 'Economics' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Environmental Science', label: 'Environmental Science' },
];

const yearRanges = [
  { value: 'all', label: 'All Years' },
  { value: '2024-2026', label: 'Last 2 years' },
  { value: '2020-2026', label: 'Last 5 years' },
  { value: '2015-2026', label: 'Last 10 years' },
  { value: '2000-2026', label: 'Since 2000' },
];

export function PaperSearchDialog({
  open,
  onOpenChange,
  onAddPaper,
}: PaperSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [field, setField] = useState('all');
  const [yearRange, setYearRange] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingPapers, setAddingPapers] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !isTauri()) return;

    setLoading(true);
    setSearched(true);

    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        limit: 20,
        offset: 0,
      };

      if (yearRange !== 'all') {
        searchQuery.year = yearRange;
      }

      if (field !== 'all') {
        searchQuery.fieldsOfStudy = [field];
      }

      const response = await searchPapers(searchQuery);
      setResults(response.results);
      setTotal(response.total);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, field, yearRange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddPaper = async (paper: SearchResult) => {
    if (!onAddPaper) return;

    setAddingPapers((prev) => new Set(prev).add(paper.paperId));

    try {
      await onAddPaper(paper);
    } finally {
      setAddingPapers((prev) => {
        const next = new Set(prev);
        next.delete(paper.paperId);
        return next;
      });
    }
  };

  const formatAuthors = (authors: SearchResult['authors']) => {
    if (!authors || authors.length === 0) return 'Unknown authors';
    if (authors.length <= 3) {
      return authors.map((a) => a.name).join(', ');
    }
    return `${authors[0].name} et al.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Academic Papers
          </DialogTitle>
        </DialogHeader>

        {/* Search Controls */}
        <div className="space-y-3 pb-3 border-b border-stone-200">
          <div className="flex gap-2">
            <Input
              placeholder="Search by title, author, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={field} onValueChange={setField}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Field of study" />
              </SelectTrigger>
              <SelectContent>
                {fieldsOfStudy.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={yearRange} onValueChange={setYearRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Year range" />
              </SelectTrigger>
              <SelectContent>
                {yearRanges.map((y) => (
                  <SelectItem key={y.value} value={y.value}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            </div>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <BookOpen className="w-12 h-12 mb-3" />
              <p className="text-sm">Enter a search query to find papers</p>
              <p className="text-xs mt-1">Powered by Semantic Scholar</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <FileText className="w-12 h-12 mb-3" />
              <p className="text-sm">No papers found</p>
              <p className="text-xs mt-1">Try different keywords or filters</p>
            </div>
          ) : (
            <div className="space-y-1 py-2">
              <p className="text-xs text-stone-400 px-1 mb-2">
                Found {total.toLocaleString()} papers
              </p>

              {results.map((paper) => (
                <div
                  key={paper.paperId}
                  className="p-3 rounded-lg border border-stone-200 hover:border-stone-300 bg-white transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h4 className="font-medium text-stone-800 text-sm leading-snug">
                        {paper.title}
                      </h4>

                      {/* Authors */}
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-stone-500">
                        <Users className="w-3 h-3" />
                        <span className="truncate">
                          {formatAuthors(paper.authors)}
                        </span>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400">
                        {paper.year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {paper.year}
                          </span>
                        )}
                        {paper.venue && (
                          <span className="truncate max-w-[200px]">
                            {paper.venue}
                          </span>
                        )}
                        {paper.citationCount !== null && (
                          <span className="flex items-center gap-1">
                            <Quote className="w-3 h-3" />
                            {paper.citationCount.toLocaleString()} citations
                          </span>
                        )}
                      </div>

                      {/* Abstract preview */}
                      {paper.abstractText && (
                        <p className="mt-2 text-xs text-stone-500 line-clamp-2">
                          {paper.abstractText}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {onAddPaper && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => handleAddPaper(paper)}
                          disabled={addingPapers.has(paper.paperId)}
                        >
                          {addingPapers.has(paper.paperId) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Add
                        </Button>
                      )}

                      {paper.url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-stone-500"
                          onClick={async () => {
                            const { open } = await import(
                              '@tauri-apps/plugin-shell'
                            );
                            await open(paper.url!);
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </Button>
                      )}

                      {paper.openAccessPdf?.url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-[#d97757]"
                          onClick={async () => {
                            const { open } = await import(
                              '@tauri-apps/plugin-shell'
                            );
                            await open(paper.openAccessPdf!.url!);
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
