'use client';

import { useState, useCallback, useMemo } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { searchPapers, isTauri, createPaper } from '@/lib/tauri/commands';
import type { SearchResult, SearchQuery, SearchSource } from '@/lib/tauri/types';
import {
  type SortField,
  type SortDirection,
  type ViewMode,
} from './constants';
import {
  SearchHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  NoResultsState,
  ResultsView,
} from './components';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['semantic_scholar']);
  const [field, setField] = useState('all');
  const [yearRange, setYearRange] = useState('all');
  const [resultsBySource, setResultsBySource] = useState<Record<string, SearchResult[]>>({});
  const [totalBySource, setTotalBySource] = useState<Record<string, number>>({});
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

  // Toggle source selection
  const handleToggleSource = useCallback((source: string) => {
    setSelectedSources((prev) => {
      if (prev.includes(source)) {
        // Don't allow deselecting all sources
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== source);
      }
      return [...prev, source];
    });
  }, []);

  // Get combined results from all selected sources
  const results = useMemo(() => {
    const combined: SearchResult[] = [];
    selectedSources.forEach((source) => {
      const sourceResults = resultsBySource[source] || [];
      sourceResults.forEach((result) => {
        // Avoid duplicates by checking paperId
        if (!combined.some((r) => r.paperId === result.paperId)) {
          combined.push({ ...result, _source: source } as SearchResult & { _source: string });
        }
      });
    });
    return combined;
  }, [selectedSources, resultsBySource]);

  // Get combined total
  const total = useMemo(() => {
    return selectedSources.reduce((sum, source) => sum + (totalBySource[source] || 0), 0);
  }, [selectedSources, totalBySource]);

  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const q = searchQuery || query;
      if (!q.trim() || !isTauri() || selectedSources.length === 0) return;

      setQuery(q);
      setLoading(true);
      setSearched(true);
      setSearchError(null);
      setAuthorFilter('');
      setVenueFilter('');

      try {
        // Search all selected sources in parallel
        const searchPromises = selectedSources.map(async (source) => {
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

          try {
            const response = await searchPapers(searchQueryObj);
            return { source, results: response.results, total: response.total };
          } catch (error) {
            console.error(`Search failed for ${source}:`, error);
            return { source, results: [], total: 0 };
          }
        });

        const responses = await Promise.all(searchPromises);

        // Store results by source
        const newResultsBySource: Record<string, SearchResult[]> = {};
        const newTotalBySource: Record<string, number> = {};

        responses.forEach(({ source, results, total }) => {
          newResultsBySource[source] = results;
          newTotalBySource[source] = total;
        });

        setResultsBySource(newResultsBySource);
        setTotalBySource(newTotalBySource);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchError(error instanceof Error ? error.message : 'Search failed');
        setResultsBySource({});
        setTotalBySource({});
      } finally {
        setLoading(false);
      }
    },
    [query, selectedSources, field, yearRange]
  );

  const handleAddPaper = useCallback(async (paper: SearchResult) => {
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
  }, []);

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

    if (authorFilter) {
      filtered = filtered.filter((paper) =>
        paper.authors?.some((a) => a.name.toLowerCase().includes(authorFilter.toLowerCase()))
      );
    }

    if (venueFilter) {
      filtered = filtered.filter((paper) =>
        paper.venue?.toLowerCase().includes(venueFilter.toLowerCase())
      );
    }

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

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('desc');
      return field;
    });
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <SearchHeader
          query={query}
          selectedSources={selectedSources}
          field={field}
          yearRange={yearRange}
          loading={loading}
          onQueryChange={setQuery}
          onToggleSource={handleToggleSource}
          onFieldChange={setField}
          onYearRangeChange={setYearRange}
          onSearch={() => handleSearch()}
        />

        <div className="flex-1 overflow-auto">
          {loading ? (
            <LoadingState
              selectedSources={selectedSources}
              query={query}
            />
          ) : searchError ? (
            <ErrorState error={searchError} onRetry={() => handleSearch()} />
          ) : !searched ? (
            <EmptyState onQuickSearch={handleSearch} onToggleSource={handleToggleSource} />
          ) : results.length === 0 ? (
            <NoResultsState />
          ) : (
            <ResultsView
              results={filteredAndSortedResults}
              total={total}
              selectedSources={selectedSources}
              addedPapers={addedPapers}
              addingPapers={addingPapers}
              viewMode={viewMode}
              sortField={sortField}
              sortDirection={sortDirection}
              authorFilter={authorFilter}
              venueFilter={venueFilter}
              uniqueAuthors={uniqueAuthors}
              uniqueVenues={uniqueVenues}
              onAddPaper={handleAddPaper}
              onSort={handleSort}
              onViewModeChange={setViewMode}
              onSortFieldChange={setSortField}
              onSortDirectionChange={setSortDirection}
              onAuthorFilterChange={setAuthorFilter}
              onVenueFilterChange={setVenueFilter}
              filteredCount={filteredAndSortedResults.length}
              totalResultsCount={results.length}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
