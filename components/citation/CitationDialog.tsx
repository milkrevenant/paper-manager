'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Download, X, Quote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  generateCitationBatch,
  exportBibtexBatch,
  exportRisBatch,
  isTauri,
} from '@/lib/tauri/commands';
import type { CitationStyle } from '@/lib/tauri/types';

interface CitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paperIds: string[];
}

const CITATION_STYLES: { value: CitationStyle; label: string; description: string }[] = [
  { value: 'apa', label: 'APA 7th', description: 'American Psychological Association' },
  { value: 'mla', label: 'MLA 9th', description: 'Modern Language Association' },
  { value: 'chicago', label: 'Chicago 17th', description: 'Chicago Manual of Style' },
  { value: 'harvard', label: 'Harvard', description: 'Harvard Referencing' },
];

export function CitationDialog({ open, onOpenChange, paperIds }: CitationDialogProps) {
  const [style, setStyle] = useState<CitationStyle>('apa');
  const [citations, setCitations] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load citations when dialog opens or style changes
  useEffect(() => {
    if (!open || paperIds.length === 0 || !isTauri()) return;

    const loadCitations = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await generateCitationBatch(paperIds, style);
        setCitations(result.content);
      } catch (err) {
        console.error('Failed to generate citations:', err);
        setError('인용 생성에 실패했습니다.');
        setCitations('');
      } finally {
        setLoading(false);
      }
    };

    loadCitations();
  }, [open, paperIds, style]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citations);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadBibtex = async () => {
    if (!isTauri()) return;
    try {
      const result = await exportBibtexBatch(paperIds);
      downloadFile(result.content, 'citations.bib', 'application/x-bibtex');
    } catch (err) {
      console.error('Failed to export BibTeX:', err);
    }
  };

  const handleDownloadRis = async () => {
    if (!isTauri()) return;
    try {
      const result = await exportRisBatch(paperIds);
      downloadFile(result.content, 'citations.ris', 'application/x-research-info-systems');
    } catch (err) {
      console.error('Failed to export RIS:', err);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Quote className="w-5 h-5 text-[#d97757]" />
            인용 내보내기
            <span className="text-sm font-normal text-stone-500">
              ({paperIds.length}개 논문)
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Style Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-stone-600">스타일:</span>
          <Select value={style} onValueChange={(v) => setStyle(v as CitationStyle)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITATION_STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-stone-500">{s.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Citations Display */}
        <ScrollArea className="flex-1 min-h-[200px] max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#d97757] border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-stone-500">인용 생성 중...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-10 text-red-500">
              {error}
            </div>
          ) : citations ? (
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
              <pre className="whitespace-pre-wrap text-sm text-stone-700 font-serif leading-relaxed">
                {citations}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center py-10 text-stone-400">
              선택된 논문이 없습니다.
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadBibtex}
              disabled={loading || !citations}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              BibTeX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadRis}
              disabled={loading || !citations}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              RIS
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              닫기
            </Button>
            <Button
              onClick={handleCopy}
              disabled={loading || !citations}
              className="gap-1.5 bg-[#d97757] hover:bg-[#c46647]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  클립보드에 복사
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
