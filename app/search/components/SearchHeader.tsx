'use client';

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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchSources, fieldsOfStudy, yearRanges } from '../constants';

interface SearchHeaderProps {
  query: string;
  source: string;
  field: string;
  yearRange: string;
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSourceChange: (source: string) => void;
  onFieldChange: (field: string) => void;
  onYearRangeChange: (yearRange: string) => void;
  onSearch: () => void;
}

export function SearchHeader({
  query,
  source,
  field,
  yearRange,
  loading,
  onQueryChange,
  onSourceChange,
  onFieldChange,
  onYearRangeChange,
  onSearch,
}: SearchHeaderProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="bg-white border-b border-stone-200 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        {/* Search Input */}
        <div className="flex-1 max-w-2xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder="논문 제목, 저자, 키워드로 검색..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-24 h-10 text-base border-stone-300 focus:border-[#d97757] focus:ring-[#d97757]/20"
          />
          <Button
            onClick={onSearch}
            disabled={loading || !query.trim()}
            size="sm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 bg-[#d97757] hover:bg-[#c46647] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={field} onValueChange={onFieldChange}>
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

          <Select value={yearRange} onValueChange={onYearRangeChange}>
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
        {searchSources
          .filter((s) => !s.disabled)
          .map((s) => {
            const Icon = s.icon;
            const isActive = source === s.value;
            return (
              <button
                key={s.value}
                onClick={() => onSourceChange(s.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
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
        {searchSources
          .filter((s) => s.disabled)
          .map((s) => {
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
  );
}
