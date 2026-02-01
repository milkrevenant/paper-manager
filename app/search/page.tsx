'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Loader2,
  ExternalLink,
  Plus,
  FileText,
  ArrowLeft,
  Quote,
  ChevronUp,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { searchPapers, isTauri, createPaper } from '@/lib/tauri/commands';
import type { SearchResult, SearchQuery } from '@/lib/tauri/types';
import { cn } from '@/lib/utils';

const searchSources = [
  { value: 'semantic_scholar', label: 'Semantic Scholar', description: 'Academic papers with citation data' },
  { value: 'arxiv', label: 'arXiv', description: 'Preprints in physics, math, CS' },
  { value: 'pubmed', label: 'PubMed', description: 'Biomedical literature', disabled: true },
  { value: 'crossref', label: 'Crossref', description: 'DOI metadata', disabled: true },
];

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

type SortField = 'title' | 'year' | 'citationCount';
type SortDirection = 'asc' | 'desc';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('semantic_scholar');
  const [field, setField] = useState('all');
  const [yearRange, setYearRange] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingPapers, setAddingPapers] = useState<Set<string>>(new Set());
  const [addedPapers, setAddedPapers] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('citationCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !isTauri()) return;

    setLoading(true);
    setSearched(true);

    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        limit: 50,
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
    if (!isTauri()) return;

    setAddingPapers((prev) => new Set(prev).add(paper.paperId));

    try {
      // Create paper entry (uses default folder)
      await createPaper({
        folderId: '', // Will use default/uncategorized folder
        title: paper.title,
        author: paper.authors?.map((a) => a.name).join(', ') || undefined,
        year: paper.year || undefined,
      });

      setAddedPapers((prev) => new Set(prev).add(paper.paperId));
    } catch (error) {
      console.error('Failed to add paper:', error);
    } finally {
      setAddingPapers((prev) => {
        const next = new Set(prev);
        next.delete(paper.paperId);
        return next;
      });
    }
  };

  const handleSort = (newField: SortField) => {
    if (sortField === newField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(newField);
      setSortDirection('desc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '');
        break;
      case 'year':
        comparison = (a.year || 0) - (b.year || 0);
        break;
      case 'citationCount':
        comparison = (a.citationCount || 0) - (b.citationCount || 0);
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatAuthors = (authors: SearchResult['authors']) => {
    if (!authors || authors.length === 0) return 'Unknown authors';
    if (authors.length <= 3) {
      return authors.map((a) => a.name).join(', ');
    }
    return `${authors[0].name} et al.`;
  };

  const SortIcon = ({ field: f }: { field: SortField }) => {
    if (sortField !== f) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-stone-200" />
          <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Academic Paper Search
          </h1>
        </div>

        {/* Search Controls */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search by title, author, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 max-w-xl"
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {searchSources.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    disabled={s.disabled}
                  >
                    <div className="flex flex-col">
                      <span>{s.label}</span>
                      {s.disabled && (
                        <span className="text-xs text-stone-400">Coming soon</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            {searched && results.length > 0 && (
              <span className="text-sm text-stone-500 flex items-center ml-4">
                Found {total.toLocaleString()} papers (showing {results.length})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden h-full flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            </div>
          ) : !searched ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
              <BookOpen className="w-16 h-16 mb-4" />
              <p className="text-lg">Enter a search query to find papers</p>
              <p className="text-sm mt-2">Powered by Semantic Scholar</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
              <FileText className="w-16 h-16 mb-4" />
              <p className="text-lg">No papers found</p>
              <p className="text-sm mt-2">Try different keywords or filters</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-stone-50">
                      <TableHead
                        className="cursor-pointer hover:bg-stone-100 select-none"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center gap-1">
                          Title
                          <SortIcon field="title" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[200px]">Authors</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-stone-100 select-none w-[80px]"
                        onClick={() => handleSort('year')}
                      >
                        <div className="flex items-center gap-1">
                          Year
                          <SortIcon field="year" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[150px]">Venue</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-stone-100 select-none w-[100px]"
                        onClick={() => handleSort('citationCount')}
                      >
                        <div className="flex items-center gap-1">
                          Citations
                          <SortIcon field="citationCount" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[150px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResults.map((paper) => (
                      <TableRow
                        key={paper.paperId}
                        className={cn(
                          'hover:bg-stone-50',
                          addedPapers.has(paper.paperId) && 'bg-green-50'
                        )}
                      >
                        <TableCell className="max-w-[400px]">
                          <div className="font-medium text-stone-800 line-clamp-2">
                            {paper.title}
                          </div>
                          {paper.abstractText && (
                            <div className="text-xs text-stone-400 line-clamp-1 mt-1">
                              {paper.abstractText}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-stone-600">
                          {formatAuthors(paper.authors)}
                        </TableCell>
                        <TableCell className="text-sm text-stone-600">
                          {paper.year || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-stone-500 truncate max-w-[150px]">
                          {paper.venue || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {paper.citationCount !== null ? (
                            <div className="flex items-center gap-1 text-stone-600">
                              <Quote className="w-3 h-3" />
                              {paper.citationCount.toLocaleString()}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {addedPapers.has(paper.paperId) ? (
                              <span className="text-xs text-green-600 font-medium px-2">
                                Added
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleAddPaper(paper)}
                                disabled={addingPapers.has(paper.paperId)}
                              >
                                {addingPapers.has(paper.paperId) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Plus className="w-3 h-3 mr-1" />
                                )}
                                Add
                              </Button>
                            )}

                            {paper.url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-stone-500"
                                onClick={async () => {
                                  const { open } = await import(
                                    '@tauri-apps/plugin-shell'
                                  );
                                  await open(paper.url!);
                                }}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}

                            {paper.openAccessPdf?.url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-[#d97757]"
                                onClick={async () => {
                                  const { open } = await import(
                                    '@tauri-apps/plugin-shell'
                                  );
                                  await open(paper.openAccessPdf!.url!);
                                }}
                              >
                                <FileText className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Footer */}
              <div className="border-t border-stone-200 px-4 py-3 bg-stone-50 flex items-center justify-between text-sm text-stone-500">
                <span>
                  Showing {sortedResults.length} of {total.toLocaleString()} papers
                </span>
                {addedPapers.size > 0 && (
                  <span className="text-green-600">
                    {addedPapers.size} paper(s) added to library
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
