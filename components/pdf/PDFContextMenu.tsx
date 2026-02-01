'use client';

import { useEffect, useRef } from 'react';
import {
  Highlighter,
  Sparkles,
  Languages,
  StickyNote,
  Copy,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFContextMenuProps {
  x: number;
  y: number;
  selectedText?: string;
  hasSelection: boolean;
  onHighlight: () => void;
  onAISummary: () => void;
  onAITranslate: () => void;
  onAddNote: () => void;
  onCopyText: () => void;
  onSearchInLibrary?: () => void;
  onClose: () => void;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: string;
  requiresSelection: boolean;
  divider?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: Highlighter, label: '하이라이트', action: 'highlight', requiresSelection: true },
  { icon: Sparkles, label: 'AI 요약', action: 'summary', requiresSelection: true },
  { icon: Languages, label: 'AI 번역', action: 'translate', requiresSelection: true },
  { icon: StickyNote, label: '메모 추가', action: 'note', requiresSelection: true },
  { icon: Copy, label: '텍스트 복사', action: 'copy', requiresSelection: true, divider: true },
  { icon: Search, label: '라이브러리에서 검색', action: 'search', requiresSelection: true },
];

export function PDFContextMenu({
  x,
  y,
  selectedText,
  hasSelection,
  onHighlight,
  onAISummary,
  onAITranslate,
  onAddNote,
  onCopyText,
  onSearchInLibrary,
  onClose,
}: PDFContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
  const menuWidth = 200;
  const menuHeight = 280;
  const padding = 8;

  const adjustedX = Math.min(x, window.innerWidth - menuWidth - padding);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - padding);

  const handleAction = (action: string) => {
    switch (action) {
      case 'highlight':
        onHighlight();
        break;
      case 'summary':
        onAISummary();
        break;
      case 'translate':
        onAITranslate();
        break;
      case 'note':
        onAddNote();
        break;
      case 'copy':
        onCopyText();
        break;
      case 'search':
        onSearchInLibrary?.();
        break;
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-stone-200 py-1 min-w-[180px]"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
    >
      {/* Show selected text preview if available */}
      {hasSelection && selectedText && (
        <div className="px-3 py-2 border-b border-stone-100">
          <p className="text-xs text-stone-400 mb-1">선택된 텍스트</p>
          <p className="text-xs text-stone-600 line-clamp-2">
            {selectedText.length > 100
              ? selectedText.slice(0, 100) + '...'
              : selectedText}
          </p>
        </div>
      )}

      {/* Menu items */}
      <div className="py-1">
        {menuItems.map((item, index) => {
          const isDisabled = item.requiresSelection && !hasSelection;
          const Icon = item.icon;

          return (
            <div key={item.action}>
              {item.divider && index > 0 && (
                <div className="my-1 border-t border-stone-100" />
              )}
              <button
                onClick={() => !isDisabled && handleAction(item.action)}
                disabled={isDisabled}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors',
                  isDisabled
                    ? 'text-stone-300 cursor-not-allowed'
                    : 'text-stone-700 hover:bg-stone-50'
                )}
              >
                <Icon className={cn('w-4 h-4', isDisabled ? 'text-stone-300' : 'text-stone-500')} />
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
