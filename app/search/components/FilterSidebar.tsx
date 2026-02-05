'use client';

import { Filter, User, Building, X, Calendar, Quote, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { yearRanges } from '../constants';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  authorFilter: string;
  venueFilter: string;
  yearFilter: string;
  minCitations: number | null;
  onAuthorFilterChange: (value: string) => void;
  onVenueFilterChange: (value: string) => void;
  onYearFilterChange: (value: string) => void;
  onMinCitationsChange: (value: number | null) => void;
  uniqueAuthors: string[];
  uniqueVenues: string[];
}

export function FilterSidebar({
  isOpen,
  onClose,
  authorFilter,
  venueFilter,
  yearFilter,
  minCitations,
  onAuthorFilterChange,
  onVenueFilterChange,
  onYearFilterChange,
  onMinCitationsChange,
  uniqueAuthors,
  uniqueVenues,
}: FilterSidebarProps) {
  const activeFilterCount =
    (authorFilter ? 1 : 0) +
    (venueFilter ? 1 : 0) +
    (yearFilter && yearFilter !== 'all' ? 1 : 0) +
    (minCitations ? 1 : 0);

  const clearAllFilters = () => {
    onAuthorFilterChange('');
    onVenueFilterChange('');
    onYearFilterChange('all');
    onMinCitationsChange(null);
  };

  return (
    <div
      className={cn(
        'h-full bg-white border-l border-stone-200 flex flex-col transition-all duration-200 overflow-hidden',
        isOpen ? 'w-72' : 'w-0'
      )}
    >
      {isOpen && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-600" />
              <h3 className="font-medium text-stone-800">필터</h3>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#d97757] text-white text-[10px] font-medium">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-stone-500 hover:text-[#d97757]"
                >
                  초기화
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-stone-100 rounded"
              >
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Author Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600 mb-2">
                <User className="w-3.5 h-3.5" />
                저자
              </label>
              <div className="relative">
                <Input
                  placeholder="저자명 검색..."
                  value={authorFilter}
                  onChange={(e) => onAuthorFilterChange(e.target.value)}
                  className="h-8 text-sm pr-8"
                />
                {authorFilter && (
                  <button
                    onClick={() => onAuthorFilterChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600" />
                  </button>
                )}
              </div>
              {uniqueAuthors.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto">
                  {uniqueAuthors.slice(0, 12).map((author) => (
                    <button
                      key={author}
                      onClick={() => onAuthorFilterChange(author)}
                      className={cn(
                        'px-2 py-0.5 rounded text-xs border transition-colors',
                        authorFilter === author
                          ? 'bg-[#d97757]/10 border-[#d97757] text-[#d97757]'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      )}
                    >
                      {author.length > 12 ? author.slice(0, 12) + '...' : author}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Venue Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600 mb-2">
                <Building className="w-3.5 h-3.5" />
                저널/출처
              </label>
              <div className="relative">
                <Input
                  placeholder="저널/출처 검색..."
                  value={venueFilter}
                  onChange={(e) => onVenueFilterChange(e.target.value)}
                  className="h-8 text-sm pr-8"
                />
                {venueFilter && (
                  <button
                    onClick={() => onVenueFilterChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600" />
                  </button>
                )}
              </div>
              {uniqueVenues.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto">
                  {uniqueVenues.slice(0, 8).map((venue) => (
                    <button
                      key={venue}
                      onClick={() => onVenueFilterChange(venue)}
                      className={cn(
                        'px-2 py-0.5 rounded text-xs border transition-colors',
                        venueFilter === venue
                          ? 'bg-[#d97757]/10 border-[#d97757] text-[#d97757]'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      )}
                    >
                      {venue.length > 18 ? venue.slice(0, 18) + '...' : venue}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Year Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600 mb-2">
                <Calendar className="w-3.5 h-3.5" />
                출판 연도
              </label>
              <div className="flex flex-wrap gap-1.5">
                {yearRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => onYearFilterChange(range.value)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs border transition-colors',
                      yearFilter === range.value
                        ? 'bg-[#d97757]/10 border-[#d97757] text-[#d97757]'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Citation Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600 mb-2">
                <Quote className="w-3.5 h-3.5" />
                최소 인용수
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[null, 10, 50, 100, 500].map((count) => (
                  <button
                    key={count ?? 'all'}
                    onClick={() => onMinCitationsChange(count)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs border transition-colors',
                      minCitations === count
                        ? 'bg-[#d97757]/10 border-[#d97757] text-[#d97757]'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    )}
                  >
                    {count === null ? '전체' : `${count}+`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface FilterToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
  activeCount: number;
}

export function FilterToggleButton({ isOpen, onClick, activeCount }: FilterToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
        isOpen
          ? 'bg-[#d97757]/10 border-[#d97757] text-[#d97757]'
          : activeCount > 0
          ? 'bg-white border-[#d97757] text-[#d97757] hover:bg-[#d97757]/5'
          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
      )}
    >
      <Filter className="w-3.5 h-3.5" />
      필터
      {activeCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-[#d97757] text-white text-[10px]">
          {activeCount}
        </span>
      )}
    </button>
  );
}
