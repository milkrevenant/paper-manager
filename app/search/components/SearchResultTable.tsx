'use client';

import {
  Plus,
  ExternalLink,
  Quote,
  Check,
  Download,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SearchResult } from '@/lib/tauri/types';
import { cn } from '@/lib/utils';
import type { SortField, SortDirection } from '../constants';

interface SearchResultTableProps {
  results: SearchResult[];
  addedPapers: Set<string>;
  addingPapers: Set<string>;
  sortField: SortField;
  sortDirection: SortDirection;
  onAddPaper: (paper: SearchResult) => void;
  onSort: (field: SortField) => void;
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

function SortIcon({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}) {
  if (currentField !== field) return <ArrowUpDown className="w-3 h-3 text-stone-400" />;
  return direction === 'asc' ? (
    <ArrowUp className="w-3 h-3 text-[#d97757]" />
  ) : (
    <ArrowDown className="w-3 h-3 text-[#d97757]" />
  );
}

export function SearchResultTable({
  results,
  addedPapers,
  addingPapers,
  sortField,
  sortDirection,
  onAddPaper,
  onSort,
}: SearchResultTableProps) {
  const handleOpenUrl = async (url: string) => {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-stone-50">
            <TableHead className="font-semibold">제목</TableHead>
            <TableHead className="w-[180px] font-semibold">저자</TableHead>
            <TableHead
              className="w-[80px] font-semibold cursor-pointer hover:bg-stone-100"
              onClick={() => onSort('year')}
            >
              <div className="flex items-center gap-1">
                연도
                <SortIcon field="year" currentField={sortField} direction={sortDirection} />
              </div>
            </TableHead>
            <TableHead className="w-[150px] font-semibold">출처</TableHead>
            <TableHead
              className="w-[90px] font-semibold cursor-pointer hover:bg-stone-100"
              onClick={() => onSort('citations')}
            >
              <div className="flex items-center gap-1">
                인용
                <SortIcon field="citations" currentField={sortField} direction={sortDirection} />
              </div>
            </TableHead>
            <TableHead className="w-[100px] text-right font-semibold">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((paper, index) => (
            <TableRow
              key={paper.paperId}
              className={cn(
                'hover:bg-stone-50',
                addedPapers.has(paper.paperId) && 'bg-green-50/50',
                index % 2 === 1 && 'bg-stone-50/30'
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
                      onClick={() => onAddPaper(paper)}
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
                      onClick={() => handleOpenUrl(paper.url!)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {paper.openAccessPdf?.url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-[#d97757] hover:bg-[#d97757]/10"
                      onClick={() => handleOpenUrl(paper.openAccessPdf!.url!)}
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
  );
}
