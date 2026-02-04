'use client';

import {
  Plus,
  ExternalLink,
  Quote,
  Check,
  Download,
  Calendar,
  Users,
  Building,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SearchResult } from '@/lib/tauri/types';
import { cn } from '@/lib/utils';

interface SearchResultCardProps {
  paper: SearchResult;
  isAdded: boolean;
  isAdding: boolean;
  onAddPaper: (paper: SearchResult) => void;
}

function formatAuthors(authors: SearchResult['authors']) {
  if (!authors || authors.length === 0) return 'Unknown authors';
  if (authors.length <= 2) {
    return authors.map((a) => a.name).join(', ');
  }
  return `${authors[0].name} et al.`;
}

function getSourceBadge(paper: SearchResult) {
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
}

export function SearchResultCard({
  paper,
  isAdded,
  isAdding,
  onAddPaper,
}: SearchResultCardProps) {
  const handleOpenUrl = async (url: string) => {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-300 hover:shadow-sm transition-all',
        isAdded && 'border-green-300 bg-green-50/30'
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
            {paper.citationCount !== null &&
              paper.citationCount !== undefined &&
              paper.citationCount > 0 && (
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
          {isAdded ? (
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium px-3 py-1.5 bg-green-100 rounded-lg">
              <Check className="w-4 h-4" />
              추가됨
            </div>
          ) : (
            <Button
              size="sm"
              className="h-8 px-3 bg-[#d97757] hover:bg-[#c46647] text-white"
              onClick={() => onAddPaper(paper)}
              disabled={isAdding}
            >
              {isAdding ? (
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
                    onClick={() => handleOpenUrl(paper.url!)}
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
                    onClick={() => handleOpenUrl(paper.openAccessPdf!.url!)}
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
  );
}
