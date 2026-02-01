'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, StickyNote, Loader2, Languages, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIResultPopupProps {
  x: number;
  y: number;
  type: 'summary' | 'translation';
  originalText: string;
  result: string;
  isLoading: boolean;
  error?: string | null;
  targetLang?: string;
  onTargetLangChange?: (lang: string) => void;
  onCopy: () => void;
  onSaveAsNote: () => void;
  onClose: () => void;
  onRetry?: () => void;
}

export function AIResultPopup({
  x,
  y,
  type,
  originalText,
  result,
  isLoading,
  error,
  targetLang = 'en',
  onTargetLangChange,
  onCopy,
  onSaveAsNote,
  onClose,
  onRetry,
}: AIResultPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Calculate position with viewport boundaries
  const popupWidth = 400;
  const popupHeight = 350;
  const padding = 16;

  const adjustedX = Math.min(Math.max(padding, x - popupWidth / 2), window.innerWidth - popupWidth - padding);
  const adjustedY = Math.min(y + 10, window.innerHeight - popupHeight - padding);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLangToggle = () => {
    const newLang = targetLang === 'en' ? 'ko' : 'en';
    onTargetLangChange?.(newLang);
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-stone-200 w-[400px] max-h-[350px] flex flex-col"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          {type === 'summary' ? (
            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-sm">✨</span>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Languages className="w-4 h-4 text-blue-600" />
            </div>
          )}
          <span className="font-medium text-stone-800">
            {type === 'summary' ? 'AI 요약' : 'AI 번역'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language toggle for translation */}
          {type === 'translation' && !isLoading && !error && (
            <button
              onClick={handleLangToggle}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-stone-100 hover:bg-stone-200 transition-colors"
            >
              <span className={cn(targetLang === 'ko' ? 'text-stone-400' : 'text-stone-700')}>
                한국어
              </span>
              <ArrowRightLeft className="w-3 h-3 text-stone-400" />
              <span className={cn(targetLang === 'en' ? 'text-stone-400' : 'text-stone-700')}>
                English
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <Loader2 className="w-8 h-8 text-[#d97757] animate-spin" />
            <p className="text-sm text-stone-500">
              {type === 'summary' ? '요약 생성 중...' : '번역 중...'}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 text-center">{error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                다시 시도
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Original text (collapsed) */}
            <details className="group">
              <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">
                원본 텍스트 보기
              </summary>
              <p className="mt-2 text-xs text-stone-500 bg-stone-50 rounded-md p-2 max-h-20 overflow-auto">
                {originalText}
              </p>
            </details>

            {/* Result */}
            <div className="prose prose-sm prose-stone max-w-none">
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                {result}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isLoading && !error && result && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-stone-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-600">복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>복사</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveAsNote}
            className="gap-1.5"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>메모로 저장</span>
          </Button>
        </div>
      )}
    </div>
  );
}
