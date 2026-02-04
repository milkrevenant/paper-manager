'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchSources, quickSearches } from '../constants';

interface LoadingStateProps {
  selectedSources: string[];
  query: string;
}

export function LoadingState({
  selectedSources,
  query,
}: LoadingStateProps) {
  const activeSources = searchSources.filter((s) => selectedSources.includes(s.value));

  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <div className="flex gap-2 mb-4">
        {activeSources.map((source) => {
          const Icon = source.icon;
          return (
            <div
              key={source.value}
              className={cn('w-12 h-12 rounded-xl flex items-center justify-center', source.color)}
            >
              <Icon className="w-6 h-6 text-white animate-pulse" />
            </div>
          );
        })}
      </div>
      <p className="text-stone-600 font-medium">
        {activeSources.length === 1
          ? `${activeSources[0].label}에서 검색 중...`
          : `${activeSources.length}개 소스에서 검색 중...`
        }
      </p>
      <p className="text-stone-400 text-sm mt-1">&quot;{query}&quot;</p>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
      <p className="text-lg font-medium text-stone-800">검색 실패</p>
      <p className="text-sm text-stone-500 mt-1 max-w-md text-center">{error}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}

interface EmptyStateProps {
  onQuickSearch: (query: string) => void;
  onToggleSource: (source: string) => void;
}

export function EmptyState({ onQuickSearch, onToggleSource }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#d97757]/20 to-[#d97757]/5 flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-[#d97757]" />
      </div>
      <h2 className="text-2xl font-bold text-stone-800 mb-2">학술 논문 검색</h2>
      <p className="text-stone-500 mb-6">
        {searchSources.filter((s) => !s.disabled).length}개의 학술 데이터베이스에서 검색합니다
      </p>

      {/* Quick Search Suggestions */}
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        <span className="text-xs text-stone-400 mr-2 py-1">빠른 검색:</span>
        {quickSearches.map((q) => (
          <button
            key={q}
            onClick={() => onQuickSearch(q)}
            className="px-3 py-1 rounded-full text-sm bg-white border border-stone-200 text-stone-600 hover:border-[#d97757] hover:text-[#d97757] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Source Preview */}
      <div className="flex gap-3 mt-8">
        {searchSources
          .filter((s) => !s.disabled)
          .map((s) => {
            const Icon = s.icon;
            return (
              <Tooltip key={s.value}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform hover:scale-110 cursor-pointer',
                      s.color
                    )}
                    onClick={() => onToggleSource(s.value)}
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
  );
}

export function NoResultsState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <FileText className="w-16 h-16 text-stone-300 mb-4" />
      <p className="text-lg font-medium text-stone-700">검색 결과가 없습니다</p>
      <p className="text-sm text-stone-500 mt-1">다른 키워드로 검색해보세요</p>
    </div>
  );
}
