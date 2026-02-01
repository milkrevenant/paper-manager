'use client';

import { useState, useCallback, useMemo } from 'react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Loader2,
  ExternalLink,
  Plus,
  FileText,
  ArrowLeft,
  Quote,
  BookOpen,
  Database,
  Beaker,
  GraduationCap,
  Globe,
  AlertCircle,
  Check,
  Download,
  Calendar,
  Users,
  Building,
  Sparkles,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  User,
} from 'lucide-react';
import { searchPapers, isTauri, createPaper } from '@/lib/tauri/commands';
import type { SearchResult, SearchQuery, SearchSource } from '@/lib/tauri/types';
import { cn } from '@/lib/utils';

const searchSources = [
  {
    value: 'semantic_scholar',
    label: 'Semantic Scholar',
    shortLabel: 'S2',
    description: 'AI-powered academic search',
    icon: Database,
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-50 hover:border-blue-300',
    activeColor: 'bg-blue-50 border-blue-500 text-blue-700',
  },
  {
    value: 'google_scholar',
    label: 'Google Scholar',
    shortLabel: 'GS',
    description: 'Comprehensive search',
    icon: Search,
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-50 hover:border-blue-300',
    activeColor: 'bg-blue-50 border-blue-600 text-blue-700',
  },
  {
    value: 'arxiv',
    label: 'arXiv',
    shortLabel: 'arXiv',
    description: 'Preprints & open access',
    icon: Beaker,
    color: 'bg-red-500',
    hoverColor: 'hover:bg-red-50 hover:border-red-300',
    activeColor: 'bg-red-50 border-red-500 text-red-700',
  },
  {
    value: 'pubmed',
    label: 'PubMed',
    shortLabel: 'PM',
    description: 'Biomedical & life sciences',
    icon: GraduationCap,
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-50 hover:border-green-300',
    activeColor: 'bg-green-50 border-green-500 text-green-700',
  },
  {
    value: 'crossref',
    label: 'Crossref',
    shortLabel: 'CR',
    description: 'DOI registry',
    icon: Globe,
    color: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-50 hover:border-purple-300',
    activeColor: 'bg-purple-50 border-purple-500 text-purple-700',
  },
  {
    value: 'kci',
    label: 'KCI',
    shortLabel: 'KCI',
    description: 'Korea Citation Index',
    disabled: true,
    icon: BookOpen,
    color: 'bg-stone-400',
    hoverColor: '',
    activeColor: '',
  },
  {
    value: 'riss',
    label: 'RISS',
    shortLabel: 'RISS',
    description: 'Korean research',
    disabled: true,
    icon: BookOpen,
    color: 'bg-stone-400',
    hoverColor: '',
    activeColor: '',
  },
];

const fieldsOfStudy = [
  { value: 'all', label: '모든 분야' },
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
  { value: 'all', label: '전체 연도' },
  { value: '2024-2026', label: '최근 2년' },
  { value: '2020-2026', label: '최근 5년' },
  { value: '2015-2026', label: '최근 10년' },
  { value: '2000-2026', label: '2000년 이후' },
];

const quickSearches = [
  'machine learning',
  'deep learning',
  'natural language processing',
  'computer vision',
  'transformer',
];

type SortField = 'relevance' | 'year' | 'citations';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'card' | 'table';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('semantic_scholar');
  const [field, setField] = useState('all');
  const [yearRange, setYearRange] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingPapers, setAddingPapers] = useState<Set<string>>(new Set());
  const [addedPapers, setAddedPapers] = useState<Set<string>>(new Set());

  // View and sort state
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter state
  const [authorFilter, setAuthorFilter] = useState('');
  const [venueFilter, setVenueFilter] = useState('');

  const currentSource = searchSources.find((s) => s.value === source) || searchSources[0];

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim() || !isTauri()) return;

    setQuery(q);
    setLoading(true);
    setSearched(true);
    setSearchError(null);
    // Reset filters on new search
    setAuthorFilter('');
    setVenueFilter('');

    try {
      const searchQueryObj: SearchQuery = {
        query: q.trim(),
        source: source as SearchSource,
        limit: 50,
        offset: 0,
      };

      if (yearRange !== 'all') {
        searchQueryObj.year = yearRange;
      }

      if (field !== 'all') {
        searchQueryObj.fieldsOfStudy = [field];
      }

      const response = await searchPapers(searchQueryObj);
      setResults(response.results);
      setTotal(response.total);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, source, field, yearRange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddPaper = async (paper: SearchResult) => {
    if (!isTauri()) return;

    setAddingPapers((prev) => new Set(prev).add(paper.paperId));

    try {
      await createPaper({
        folderId: '',
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

  // Extract unique authors and venues for filter options
  const { uniqueAuthors, uniqueVenues } = useMemo(() => {
    const authors = new Set<string>();
    const venues = new Set<string>();

    results.forEach((paper) => {
      paper.authors?.forEach((a) => {
        if (a.name) authors.add(a.name);
      });
      if (paper.venue) venues.add(paper.venue);
    });

    return {
      uniqueAuthors: Array.from(authors).sort(),
      uniqueVenues: Array.from(venues).sort(),
    };
  }, [results]);

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...results];

    // Apply author filter
    if (authorFilter) {
      filtered = filtered.filter((paper) =>
        paper.authors?.some((a) =>
          a.name.toLowerCase().includes(authorFilter.toLowerCase())
        )
      );
    }

    // Apply venue filter
    if (venueFilter) {
      filtered = filtered.filter((paper) =>
        paper.venue?.toLowerCase().includes(venueFilter.toLowerCase())
      );
    }

    // Apply sorting
    if (sortField !== 'relevance') {
      filtered.sort((a, b) => {
        let comparison = 0;
        if (sortField === 'year') {
          comparison = (a.year || 0) - (b.year || 0);
        } else if (sortField === 'citations') {
          comparison = (a.citationCount || 0) - (b.citationCount || 0);
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [results, authorFilter, venueFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatAuthors = (authors: SearchResult['authors']) => {
    if (!authors || authors.length === 0) return 'Unknown authors';
    if (authors.length <= 2) {
      return authors.map((a) => a.name).join(', ');
    }
    return `${authors[0].name} et al.`;
  };

  const getSourceBadge = (paper: SearchResult) => {
    const ids = paper.externalIds;
    if (!ids) return null;

    if (ids.arxivId) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
          arXiv
        </span>
      );
    }
    if (ids.pubmed) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
          PubMed
        </span>
      );
    }
    if (ids.doi) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
          DOI
        </span>
      );
    }
    return null;
  };

  const SortIcon = ({ field: f }: { field: SortField }) => {
    if (sortField !== f) return <ArrowUpDown className="w-3 h-3 text-stone-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#d97757]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#d97757]" />
    );
  };

  const activeFilterCount = (authorFilter ? 1 : 0) + (venueFilter ? 1 : 0);

  const SourceIcon = currentSource.icon;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-stone-50 flex flex-col">
        {/* Compact Header */}
        <div className="bg-white border-b border-stone-200 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-stone-500 hover:text-stone-700">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>

            {/* Search Input - Main Focus */}
            <div className="flex-1 max-w-2xl relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder="논문 제목, 저자, 키워드로 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-24 h-10 text-base border-stone-300 focus:border-[#d97757] focus:ring-[#d97757]/20"
              />
              <Button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                size="sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 bg-[#d97757] hover:bg-[#c46647] text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select value={field} onValueChange={setField}>
                <SelectTrigger className="h-8 w-[130px] text-xs border-stone-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldsOfStudy.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-sm">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={yearRange} onValueChange={setYearRange}>
                <SelectTrigger className="h-8 w-[110px] text-xs border-stone-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearRanges.map((y) => (
                    <SelectItem key={y.value} value={y.value} className="text-sm">
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
            {searchSources.filter(s => !s.disabled).map((s) => {
              const Icon = s.icon;
              const isActive = source === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSource(s.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    isActive
                      ? s.activeColor
                      : `bg-white border-stone-200 text-stone-600 ${s.hoverColor}`
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              );
            })}
            <div className="w-px h-5 bg-stone-200 mx-1" />
            {searchSources.filter(s => s.disabled).map((s) => {
              const Icon = s.icon;
              return (
                <Tooltip key={s.value}>
                  <TooltipTrigger asChild>
                    <button
                      disabled
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {s.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4", currentSource.color)}>
                <SourceIcon className="w-8 h-8 text-white animate-pulse" />
              </div>
              <p className="text-stone-600 font-medium">{currentSource.label}에서 검색 중...</p>
              <p className="text-stone-400 text-sm mt-1">"{query}"</p>
            </div>
          ) : searchError ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
              <p className="text-lg font-medium text-stone-800">검색 실패</p>
              <p className="text-sm text-stone-500 mt-1 max-w-md text-center">{searchError}</p>
              <Button variant="outline" className="mt-4" onClick={() => handleSearch()}>
                다시 시도
              </Button>
            </div>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#d97757]/20 to-[#d97757]/5 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-[#d97757]" />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">학술 논문 검색</h2>
              <p className="text-stone-500 mb-6">
                {searchSources.filter(s => !s.disabled).length}개의 학술 데이터베이스에서 검색합니다
              </p>

              {/* Quick Search Suggestions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                <span className="text-xs text-stone-400 mr-2 py-1">빠른 검색:</span>
                {quickSearches.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSearch(q)}
                    className="px-3 py-1 rounded-full text-sm bg-white border border-stone-200 text-stone-600 hover:border-[#d97757] hover:text-[#d97757] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Source Preview */}
              <div className="flex gap-3 mt-8">
                {searchSources.filter(s => !s.disabled).map((s) => {
                  const Icon = s.icon;
                  return (
                    <Tooltip key={s.value}>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform hover:scale-110 cursor-pointer",
                          s.color
                        )}
                        onClick={() => setSource(s.value)}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{s.label}</p>
                        <p className="text-xs text-stone-400">{s.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <FileText className="w-16 h-16 text-stone-300 mb-4" />
              <p className="text-lg font-medium text-stone-700">검색 결과가 없습니다</p>
              <p className="text-sm text-stone-500 mt-1">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <div className="p-4">
              {/* Results Header with Controls */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", currentSource.color)} />
                  <span className="text-sm text-stone-600">
                    <strong className="text-stone-800">{total.toLocaleString()}</strong>개 논문
                    {filteredAndSortedResults.length !== results.length && (
                      <span className="text-stone-400"> · {filteredAndSortedResults.length}개 필터됨</span>
                    )}
                  </span>
                  {addedPapers.size > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                      <Check className="w-4 h-4" />
                      {addedPapers.size}개 추가됨
                    </span>
                  )}
                </div>

                {/* View/Sort/Filter Controls */}
                <div className="flex items-center gap-2">
                  {/* Filter Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 gap-1.5 text-xs",
                          activeFilterCount > 0 && "border-[#d97757] text-[#d97757]"
                        )}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        필터
                        {activeFilterCount > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#d97757] text-white text-[10px]">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="end">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">필터</h4>
                          {activeFilterCount > 0 && (
                            <button
                              onClick={() => {
                                setAuthorFilter('');
                                setVenueFilter('');
                              }}
                              className="text-xs text-stone-500 hover:text-stone-700"
                            >
                              초기화
                            </button>
                          )}
                        </div>

                        {/* Author Filter */}
                        <div>
                          <label className="text-xs text-stone-500 mb-1 block">저자</label>
                          <div className="relative">
                            <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                            <Input
                              placeholder="저자명 검색..."
                              value={authorFilter}
                              onChange={(e) => setAuthorFilter(e.target.value)}
                              className="h-8 pl-8 text-sm"
                            />
                            {authorFilter && (
                              <button
                                onClick={() => setAuthorFilter('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                              >
                                <X className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600" />
                              </button>
                            )}
                          </div>
                          {uniqueAuthors.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                              {uniqueAuthors.slice(0, 10).map((author) => (
                                <button
                                  key={author}
                                  onClick={() => setAuthorFilter(author)}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-xs border transition-colors",
                                    authorFilter === author
                                      ? "bg-[#d97757]/10 border-[#d97757] text-[#d97757]"
                                      : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                                  )}
                                >
                                  {author.length > 15 ? author.slice(0, 15) + '...' : author}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Venue Filter */}
                        <div>
                          <label className="text-xs text-stone-500 mb-1 block">저널/출처</label>
                          <div className="relative">
                            <Building className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                            <Input
                              placeholder="저널/출처 검색..."
                              value={venueFilter}
                              onChange={(e) => setVenueFilter(e.target.value)}
                              className="h-8 pl-8 text-sm"
                            />
                            {venueFilter && (
                              <button
                                onClick={() => setVenueFilter('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                              >
                                <X className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600" />
                              </button>
                            )}
                          </div>
                          {uniqueVenues.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                              {uniqueVenues.slice(0, 8).map((venue) => (
                                <button
                                  key={venue}
                                  onClick={() => setVenueFilter(venue)}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-xs border transition-colors",
                                    venueFilter === venue
                                      ? "bg-[#d97757]/10 border-[#d97757] text-[#d97757]"
                                      : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                                  )}
                                >
                                  {venue.length > 20 ? venue.slice(0, 20) + '...' : venue}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Sort Dropdown */}
                  <Select
                    value={`${sortField}-${sortDirection}`}
                    onValueChange={(v) => {
                      const [field, dir] = v.split('-') as [SortField, SortDirection];
                      setSortField(field);
                      setSortDirection(dir);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance-desc">관련도순</SelectItem>
                      <SelectItem value="year-desc">최신순</SelectItem>
                      <SelectItem value="year-asc">오래된순</SelectItem>
                      <SelectItem value="citations-desc">인용수 높은순</SelectItem>
                      <SelectItem value="citations-asc">인용수 낮은순</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Toggle */}
                  <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('card')}
                      className={cn(
                        "p-1.5 transition-colors",
                        viewMode === 'card'
                          ? "bg-stone-100 text-stone-800"
                          : "bg-white text-stone-400 hover:text-stone-600"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={cn(
                        "p-1.5 transition-colors",
                        viewMode === 'table'
                          ? "bg-stone-100 text-stone-800"
                          : "bg-white text-stone-400 hover:text-stone-600"
                      )}
                    >
                      <LayoutList className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filters Display */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 mb-3 px-2">
                  <span className="text-xs text-stone-500">활성 필터:</span>
                  {authorFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-700">
                      <User className="w-3 h-3" />
                      {authorFilter}
                      <button onClick={() => setAuthorFilter('')}>
                        <X className="w-3 h-3 hover:text-red-500" />
                      </button>
                    </span>
                  )}
                  {venueFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-700">
                      <Building className="w-3 h-3" />
                      {venueFilter.length > 25 ? venueFilter.slice(0, 25) + '...' : venueFilter}
                      <button onClick={() => setVenueFilter('')}>
                        <X className="w-3 h-3 hover:text-red-500" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Card View */}
              {viewMode === 'card' && (
                <div className="grid gap-3">
                  {filteredAndSortedResults.map((paper) => (
                    <div
                      key={paper.paperId}
                      className={cn(
                        "bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-300 hover:shadow-sm transition-all",
                        addedPapers.has(paper.paperId) && "border-green-300 bg-green-50/30"
                      )}
                    >
                      <div className="flex gap-4">
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h3 className="font-semibold text-stone-800 leading-snug mb-2 line-clamp-2">
                            {paper.title}
                          </h3>

                          {/* Meta Info */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500 mb-2">
                            {paper.authors && paper.authors.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {formatAuthors(paper.authors)}
                              </span>
                            )}
                            {paper.year && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {paper.year}
                              </span>
                            )}
                            {paper.venue && (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <Building className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{paper.venue}</span>
                              </span>
                            )}
                          </div>

                          {/* Abstract */}
                          {paper.abstractText && (
                            <p className="text-sm text-stone-500 line-clamp-2 mb-3">
                              {paper.abstractText}
                            </p>
                          )}

                          {/* Badges */}
                          <div className="flex items-center gap-2">
                            {getSourceBadge(paper)}
                            {paper.citationCount !== null && paper.citationCount !== undefined && paper.citationCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                                <Quote className="w-3 h-3" />
                                {paper.citationCount.toLocaleString()} citations
                              </span>
                            )}
                            {paper.openAccessPdf?.url && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                Open Access
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 shrink-0">
                          {addedPapers.has(paper.paperId) ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm font-medium px-3 py-1.5 bg-green-100 rounded-lg">
                              <Check className="w-4 h-4" />
                              추가됨
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 px-3 bg-[#d97757] hover:bg-[#c46647] text-white"
                              onClick={() => handleAddPaper(paper)}
                              disabled={addingPapers.has(paper.paperId)}
                            >
                              {addingPapers.has(paper.paperId) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  추가
                                </>
                              )}
                            </Button>
                          )}

                          <div className="flex gap-1">
                            {paper.url && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={async () => {
                                      const { open } = await import('@tauri-apps/plugin-shell');
                                      await open(paper.url!);
                                    }}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>웹에서 보기</TooltipContent>
                              </Tooltip>
                            )}

                            {paper.openAccessPdf?.url && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-[#d97757] border-[#d97757]/30 hover:bg-[#d97757]/10"
                                    onClick={async () => {
                                      const { open } = await import('@tauri-apps/plugin-shell');
                                      await open(paper.openAccessPdf!.url!);
                                    }}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>PDF 다운로드</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-stone-50">
                        <TableHead className="font-semibold">제목</TableHead>
                        <TableHead className="w-[180px] font-semibold">저자</TableHead>
                        <TableHead
                          className="w-[80px] font-semibold cursor-pointer hover:bg-stone-100"
                          onClick={() => handleSort('year')}
                        >
                          <div className="flex items-center gap-1">
                            연도
                            <SortIcon field="year" />
                          </div>
                        </TableHead>
                        <TableHead className="w-[150px] font-semibold">출처</TableHead>
                        <TableHead
                          className="w-[90px] font-semibold cursor-pointer hover:bg-stone-100"
                          onClick={() => handleSort('citations')}
                        >
                          <div className="flex items-center gap-1">
                            인용
                            <SortIcon field="citations" />
                          </div>
                        </TableHead>
                        <TableHead className="w-[100px] text-right font-semibold">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedResults.map((paper, index) => (
                        <TableRow
                          key={paper.paperId}
                          className={cn(
                            "hover:bg-stone-50",
                            addedPapers.has(paper.paperId) && "bg-green-50/50",
                            index % 2 === 1 && "bg-stone-50/30"
                          )}
                        >
                          <TableCell className="max-w-[400px]">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-stone-800 line-clamp-2 text-sm">
                                  {paper.title}
                                </div>
                              </div>
                              {getSourceBadge(paper)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-stone-600">
                            {formatAuthors(paper.authors)}
                          </TableCell>
                          <TableCell className="text-sm text-stone-600 font-medium">
                            {paper.year || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-stone-500">
                            <span className="truncate block max-w-[140px]" title={paper.venue || undefined}>
                              {paper.venue || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {paper.citationCount !== null && paper.citationCount !== undefined ? (
                              <div className="flex items-center gap-1 text-stone-600">
                                <Quote className="w-3 h-3 text-amber-500" />
                                <span className="font-medium">{paper.citationCount.toLocaleString()}</span>
                              </div>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {addedPapers.has(paper.paperId) ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-[#d97757] hover:bg-[#d97757]/10"
                                  onClick={() => handleAddPaper(paper)}
                                  disabled={addingPapers.has(paper.paperId)}
                                >
                                  {addingPapers.has(paper.paperId) ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              )}
                              {paper.url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-stone-500 hover:text-stone-700"
                                  onClick={async () => {
                                    const { open } = await import('@tauri-apps/plugin-shell');
                                    await open(paper.url!);
                                  }}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {paper.openAccessPdf?.url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-[#d97757] hover:bg-[#d97757]/10"
                                  onClick={async () => {
                                    const { open } = await import('@tauri-apps/plugin-shell');
                                    await open(paper.openAccessPdf!.url!);
                                  }}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
