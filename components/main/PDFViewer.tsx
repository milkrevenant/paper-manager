'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { isTauri } from '@/lib/tauri/commands';

interface PDFViewerProps {
  pdfUrl?: string;
}

export function PDFViewer({ pdfUrl }: PDFViewerProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setDisplayUrl(null);
      return;
    }

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        if (isTauri()) {
          // Convert local file path to asset URL for Tauri
          const { convertFileSrc } = await import('@tauri-apps/api/core');
          const assetUrl = convertFileSrc(pdfUrl);
          setDisplayUrl(assetUrl);
        } else {
          // For web, use the URL directly (if it's a remote URL)
          setDisplayUrl(pdfUrl);
        }
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError('PDF를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl]);

  if (!pdfUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">논문을 선택하세요</p>
          <p className="text-sm text-stone-400 mt-1">PDF가 여기에 표시됩니다</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#d97757] mx-auto mb-3 animate-spin" />
          <p className="text-stone-500 text-sm">PDF 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <p className="text-sm text-stone-400 mt-1">파일 경로: {pdfUrl}</p>
        </div>
      </div>
    );
  }

  if (!displayUrl) {
    return null;
  }

  return (
    <div className="h-full w-full bg-stone-100">
      <iframe
        src={displayUrl}
        className="w-full h-full border-0"
        title="PDF Viewer"
      />
    </div>
  );
}
