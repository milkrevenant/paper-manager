'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, LayoutGrid, LayoutList, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/lib/tauri/types';
import {
  searchSources,
  type SortField,
  type SortDirection,
  type ViewMode,
} from '../constants';
import { SearchResultCard } from './SearchResultCard';
import { SearchResultTable } from './SearchResultTable';
import { FilterPopover, ActiveFiltersDisplay } from './FilterPopover';

interface ResultsViewProps {
  results: SearchResult[];
  total: number;
  currentSource: (typeof searchSources)[0];
  addedPapers: Set<string>;
  addingPapers: Set<string>;
  viewMode: ViewMode;
  sortField: SortField;
  sortDirection: SortDirection;
  authorFilter: string;
  venueFilter: string;
  uniqueAuthors: string[];
  uniqueVenues: string[];
  onAddPaper: (paper: SearchResult) => void;
  onSort: (field: SortField) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortFieldChange: (field: SortField) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onAuthorFilterChange: (value: string) => void;
  onVenueFilterChange: (value: string) => void;
  filteredCount: number;
  totalResultsCount: number;
}

export function ResultsView({
  results,
  total,
  currentSource,
  addedPapers,
  addingPapers,
  viewMode,
  sortField,
  sortDirection,
  authorFilter,
  venueFilter,
  uniqueAuthors,
  uniqueVenues,
  onAddPaper,
  onSort,
  onViewModeChange,
  onSortFieldChange,
  onSortDirectionChange,
  onAuthorFilterChange,
  onVenueFilterChange,
  filteredCount,
  totalResultsCount,
}: ResultsViewProps) {
  return (
    <div className="p-4">
      {/* Results Header with Controls */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full', currentSource.color)} />
          <span className="text-sm text-stone-600">
            <strong className="text-stone-800">{total.toLocaleString()}</strong>개 논문
            {filteredCount !== totalResultsCount && (
              <span className="text-stone-400"> · {filteredCount}개 필터됨</span>
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
          <FilterPopover
            authorFilter={authorFilter}
            venueFilter={venueFilter}
            onAuthorFilterChange={onAuthorFilterChange}
            onVenueFilterChange={onVenueFilterChange}
            uniqueAuthors={uniqueAuthors}
            uniqueVenues={uniqueVenues}
          />

          {/* Sort Dropdown */}
          <Select
            value={`${sortField}-${sortDirection}`}
            onValueChange={(v) => {
              const [f, dir] = v.split('-') as [SortField, SortDirection];
              onSortFieldChange(f);
              onSortDirectionChange(dir);
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
              onClick={() => onViewModeChange('card')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'card'
                  ? 'bg-stone-100 text-stone-800'
                  : 'bg-white text-stone-400 hover:text-stone-600'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'table'
                  ? 'bg-stone-100 text-stone-800'
                  : 'bg-white text-stone-400 hover:text-stone-600'
              )}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      <ActiveFiltersDisplay
        authorFilter={authorFilter}
        venueFilter={venueFilter}
        onClearAuthorFilter={() => onAuthorFilterChange('')}
        onClearVenueFilter={() => onVenueFilterChange('')}
      />

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="grid gap-3">
          {results.map((paper) => (
            <SearchResultCard
              key={paper.paperId}
              paper={paper}
              isAdded={addedPapers.has(paper.paperId)}
              isAdding={addingPapers.has(paper.paperId)}
              onAddPaper={onAddPaper}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <SearchResultTable
          results={results}
          addedPapers={addedPapers}
          addingPapers={addingPapers}
          sortField={sortField}
          sortDirection={sortDirection}
          onAddPaper={onAddPaper}
          onSort={onSort}
        />
      )}
    </div>
  );
}
