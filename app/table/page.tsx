'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpDown,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
  BookOpen,
  FlaskConical,
  Loader2,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAllPapers, Paper } from '@/hooks/usePapers';

type SortField = 'paperNumber' | 'title' | 'author' | 'year' | 'publisher' | 'importance' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

interface ColumnVisibility {
  paperNumber: boolean;
  title: boolean;
  author: boolean;
  year: boolean;
  publisher: boolean;
  subject: boolean;
  keywords: boolean;
  purposes: boolean;
  researchType: boolean;
  results: boolean;
  limitations: boolean;
  importance: boolean;
  isRead: boolean;
  aiAnalyzed: boolean;
  userNotes: boolean;
  createdAt: boolean;
  updatedAt: boolean;
}

export default function TablePage() {
  const { papers: firestorePapers, loading, error } = useAllPapers();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('paperNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    paperNumber: true,
    title: true,
    author: true,
    year: true,
    publisher: true,
    subject: true,
    keywords: false,
    purposes: false,
    researchType: true,
    results: false,
    limitations: false,
    importance: true,
    isRead: true,
    aiAnalyzed: true,
    userNotes: false,
    createdAt: true,
    updatedAt: false,
  });

  const papers = firestorePapers;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedPapers = useMemo(() => {
    let result = [...papers];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (paper) =>
          paper.title.toLowerCase().includes(term) ||
          paper.author.toLowerCase().includes(term) ||
          paper.keywords.toLowerCase().includes(term) ||
          paper.subject.toLowerCase().includes(term) ||
          paper.publisher.toLowerCase().includes(term) ||
          paper.purposes.some(p => p.toLowerCase().includes(term)) ||
          paper.results.some(r => r.toLowerCase().includes(term))
      );
    }

    // Sort
    result.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        // String dates in ISO format sort correctly as strings
        aValue = aValue || '';
        bValue = bValue || '';
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [papers, searchTerm, sortField, sortDirection]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-stone-50 select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        ) : (
          <ArrowUpDown className="w-4 h-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const exportToCSV = () => {
    const headers = [
      'No', 'Title', 'Author', 'Year', 'Publisher', 'Subject', 'Keywords',
      'Purposes', 'Research Type', 'Results', 'Limitations', 'Importance', 'Read', 'AI Analyzed', 'Notes', 'Created', 'Updated'
    ];
    const rows = filteredAndSortedPapers.map((paper) => [
      paper.paperNumber,
      paper.title,
      paper.author,
      paper.year,
      paper.publisher,
      paper.subject,
      paper.keywords,
      paper.purposes.join('; '),
      `${paper.isQualitative ? 'Qual' : ''}${paper.isQualitative && paper.isQuantitative ? '+' : ''}${paper.isQuantitative ? 'Quant' : ''}`,
      paper.results.join('; '),
      paper.limitations.join('; '),
      paper.importance,
      paper.isRead ? 'Yes' : 'No',
      paper.lastAnalyzedAt ? 'Yes' : 'No',
      paper.userNotes,
      paper.createdAt,
      paper.updatedAt,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Korean
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `papers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Header */}
      <div className="h-14 bg-white border-b border-stone-200 flex items-center px-4 gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            대시보드
          </Button>
        </Link>

        <div className="flex-1" />

        <h1 className="text-lg font-semibold text-stone-800">논문 메타데이터 테이블</h1>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder="제목, 저자, 키워드 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              열 표시
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-auto">
            <DropdownMenuLabel>표시할 열 선택</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={columnVisibility.paperNumber} onCheckedChange={() => toggleColumn('paperNumber')}>
              번호
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.title} onCheckedChange={() => toggleColumn('title')}>
              제목
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.author} onCheckedChange={() => toggleColumn('author')}>
              저자
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.year} onCheckedChange={() => toggleColumn('year')}>
              연도
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.publisher} onCheckedChange={() => toggleColumn('publisher')}>
              출판사
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.subject} onCheckedChange={() => toggleColumn('subject')}>
              주제
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.keywords} onCheckedChange={() => toggleColumn('keywords')}>
              키워드
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={columnVisibility.purposes} onCheckedChange={() => toggleColumn('purposes')}>
              연구 목적
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.researchType} onCheckedChange={() => toggleColumn('researchType')}>
              연구 유형
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.results} onCheckedChange={() => toggleColumn('results')}>
              주요 결과
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.limitations} onCheckedChange={() => toggleColumn('limitations')}>
              한계점
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={columnVisibility.importance} onCheckedChange={() => toggleColumn('importance')}>
              중요도
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.isRead} onCheckedChange={() => toggleColumn('isRead')}>
              읽음
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.aiAnalyzed} onCheckedChange={() => toggleColumn('aiAnalyzed')}>
              AI 분석
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.userNotes} onCheckedChange={() => toggleColumn('userNotes')}>
              메모
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={columnVisibility.createdAt} onCheckedChange={() => toggleColumn('createdAt')}>
              등록일
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={columnVisibility.updatedAt} onCheckedChange={() => toggleColumn('updatedAt')}>
              수정일
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export */}
        <Button variant="outline" size="sm" className="gap-2" onClick={exportToCSV}>
          <Download className="w-4 h-4" />
          CSV
        </Button>
      </div>

      {/* Table */}
      <div className="p-4">
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              <span className="ml-2 text-stone-500">데이터 로딩 중...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-red-500">
              오류: {error.message}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-stone-50">
                      {columnVisibility.paperNumber && <SortableHeader field="paperNumber">No</SortableHeader>}
                      {columnVisibility.title && <SortableHeader field="title">제목</SortableHeader>}
                      {columnVisibility.author && <SortableHeader field="author">저자</SortableHeader>}
                      {columnVisibility.year && <SortableHeader field="year">연도</SortableHeader>}
                      {columnVisibility.publisher && <SortableHeader field="publisher">출판사</SortableHeader>}
                      {columnVisibility.subject && <TableHead className="whitespace-nowrap">주제</TableHead>}
                      {columnVisibility.keywords && <TableHead className="whitespace-nowrap">키워드</TableHead>}
                      {columnVisibility.purposes && <TableHead className="whitespace-nowrap">연구 목적</TableHead>}
                      {columnVisibility.researchType && <TableHead className="whitespace-nowrap">연구 유형</TableHead>}
                      {columnVisibility.results && <TableHead className="whitespace-nowrap">주요 결과</TableHead>}
                      {columnVisibility.limitations && <TableHead className="whitespace-nowrap">한계점</TableHead>}
                      {columnVisibility.importance && <SortableHeader field="importance">중요도</SortableHeader>}
                      {columnVisibility.isRead && <TableHead className="whitespace-nowrap">읽음</TableHead>}
                      {columnVisibility.aiAnalyzed && <TableHead className="whitespace-nowrap">AI</TableHead>}
                      {columnVisibility.userNotes && <TableHead className="whitespace-nowrap">메모</TableHead>}
                      {columnVisibility.createdAt && <SortableHeader field="createdAt">등록일</SortableHeader>}
                      {columnVisibility.updatedAt && <SortableHeader field="updatedAt">수정일</SortableHeader>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPapers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={20} className="text-center py-10 text-stone-500">
                          {searchTerm ? '검색 결과가 없습니다.' : '등록된 논문이 없습니다.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedPapers.map((paper) => (
                        <TableRow key={paper.id} className="hover:bg-stone-50">
                          {columnVisibility.paperNumber && (
                            <TableCell className="font-medium text-stone-500">{paper.paperNumber}</TableCell>
                          )}
                          {columnVisibility.title && (
                            <TableCell className="max-w-[300px]">
                              <Link href={`/dashboard?paper=${paper.id}`} className="hover:text-[#d97757] hover:underline">
                                <span className="line-clamp-2">{paper.title}</span>
                              </Link>
                            </TableCell>
                          )}
                          {columnVisibility.author && <TableCell className="whitespace-nowrap">{paper.author}</TableCell>}
                          {columnVisibility.year && <TableCell>{paper.year}</TableCell>}
                          {columnVisibility.publisher && <TableCell className="whitespace-nowrap">{paper.publisher}</TableCell>}
                          {columnVisibility.subject && <TableCell className="whitespace-nowrap">{paper.subject}</TableCell>}
                          {columnVisibility.keywords && (
                            <TableCell className="max-w-[200px]">
                              <span className="line-clamp-1 text-stone-500 text-sm">{paper.keywords}</span>
                            </TableCell>
                          )}
                          {columnVisibility.purposes && (
                            <TableCell className="max-w-[200px]">
                              <span className="line-clamp-2 text-stone-600 text-sm">
                                {paper.purposes.slice(0, 2).join(', ')}
                                {paper.purposes.length > 2 && ` +${paper.purposes.length - 2}`}
                              </span>
                            </TableCell>
                          )}
                          {columnVisibility.researchType && (
                            <TableCell>
                              <div className="flex gap-1">
                                {paper.isQualitative && (
                                  <Badge variant="secondary" className="text-xs gap-1 whitespace-nowrap">
                                    <BookOpen className="w-3 h-3" />
                                    질적
                                  </Badge>
                                )}
                                {paper.isQuantitative && (
                                  <Badge variant="secondary" className="text-xs gap-1 whitespace-nowrap">
                                    <FlaskConical className="w-3 h-3" />
                                    양적
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {columnVisibility.results && (
                            <TableCell className="max-w-[250px]">
                              <span className="line-clamp-2 text-stone-600 text-sm">
                                {paper.results.slice(0, 1).join(', ')}
                                {paper.results.length > 1 && ` +${paper.results.length - 1}`}
                              </span>
                            </TableCell>
                          )}
                          {columnVisibility.limitations && (
                            <TableCell className="max-w-[200px]">
                              <span className="line-clamp-1 text-stone-500 text-sm">
                                {paper.limitations.slice(0, 1).join(', ')}
                              </span>
                            </TableCell>
                          )}
                          {columnVisibility.importance && (
                            <TableCell>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={star <= paper.importance ? 'text-amber-400' : 'text-stone-200'}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                          )}
                          {columnVisibility.isRead && (
                            <TableCell>
                              {paper.isRead ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <span className="w-4 h-4 block" />
                              )}
                            </TableCell>
                          )}
                          {columnVisibility.aiAnalyzed && (
                            <TableCell>
                              {paper.lastAnalyzedAt ? (
                                <Sparkles className="w-4 h-4 text-[#d97757]" />
                              ) : (
                                <span className="w-4 h-4 block text-stone-300">-</span>
                              )}
                            </TableCell>
                          )}
                          {columnVisibility.userNotes && (
                            <TableCell className="max-w-[150px]">
                              <span className="line-clamp-1 text-stone-500 text-sm">
                                {paper.userNotes || '-'}
                              </span>
                            </TableCell>
                          )}
                          {columnVisibility.createdAt && (
                            <TableCell className="text-stone-500 text-sm whitespace-nowrap">
                              {paper.createdAt ? new Date(paper.createdAt).toLocaleDateString('ko-KR') : '-'}
                            </TableCell>
                          )}
                          {columnVisibility.updatedAt && (
                            <TableCell className="text-stone-500 text-sm whitespace-nowrap">
                              {paper.updatedAt ? new Date(paper.updatedAt).toLocaleDateString('ko-KR') : '-'}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Footer */}
              <div className="border-t border-stone-200 px-4 py-3 bg-stone-50 flex items-center justify-between text-sm text-stone-500">
                <span>총 {filteredAndSortedPapers.length}개 논문</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
