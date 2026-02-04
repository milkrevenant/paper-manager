'use client';

import { Filter, User, Building, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FilterPopoverProps {
  authorFilter: string;
  venueFilter: string;
  onAuthorFilterChange: (value: string) => void;
  onVenueFilterChange: (value: string) => void;
  uniqueAuthors: string[];
  uniqueVenues: string[];
}

export function FilterPopover({
  authorFilter,
  venueFilter,
  onAuthorFilterChange,
  onVenueFilterChange,
  uniqueAuthors,
  uniqueVenues,
}: FilterPopoverProps) {
  const activeFilterCount = (authorFilter ? 1 : 0) + (venueFilter ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs',
            activeFilterCount > 0 && 'border-[#d97757] text-[#d97757]'
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
                  onAuthorFilterChange('');
                  onVenueFilterChange('');
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
                onChange={(e) => onAuthorFilterChange(e.target.value)}
                className="h-8 pl-8 text-sm"
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
              <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                {uniqueAuthors.slice(0, 10).map((author) => (
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
                onChange={(e) => onVenueFilterChange(e.target.value)}
                className="h-8 pl-8 text-sm"
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
              <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
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
                    {venue.length > 20 ? venue.slice(0, 20) + '...' : venue}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ActiveFiltersDisplayProps {
  authorFilter: string;
  venueFilter: string;
  onClearAuthorFilter: () => void;
  onClearVenueFilter: () => void;
}

export function ActiveFiltersDisplay({
  authorFilter,
  venueFilter,
  onClearAuthorFilter,
  onClearVenueFilter,
}: ActiveFiltersDisplayProps) {
  const hasFilters = authorFilter || venueFilter;
  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-2 mb-3 px-2">
      <span className="text-xs text-stone-500">활성 필터:</span>
      {authorFilter && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-700">
          <User className="w-3 h-3" />
          {authorFilter}
          <button onClick={onClearAuthorFilter}>
            <X className="w-3 h-3 hover:text-red-500" />
          </button>
        </span>
      )}
      {venueFilter && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-700">
          <Building className="w-3 h-3" />
          {venueFilter.length > 25 ? venueFilter.slice(0, 25) + '...' : venueFilter}
          <button onClick={onClearVenueFilter}>
            <X className="w-3 h-3 hover:text-red-500" />
          </button>
        </span>
      )}
    </div>
  );
}
