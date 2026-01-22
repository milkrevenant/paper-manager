'use client';

import { FileText } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl?: string;
}

export function PDFViewer({ pdfUrl }: PDFViewerProps) {
  if (!pdfUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">논문을 선택하세요</p>
          <p className="text-sm text-gray-400 mt-1">PDF가 여기에 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="text-center">
        <FileText className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">PDF 뷰어</p>
        <p className="text-sm text-gray-500 mt-1">React-PDF 통합 예정</p>
      </div>
    </div>
  );
}
