'use client';

import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Green', value: '#90EE90' },
  { name: 'Blue', value: '#87CEEB' },
  { name: 'Pink', value: '#FFB6C1' },
  { name: 'Orange', value: '#FFA500' },
];

interface HighlightPopupProps {
  x: number;
  y: number;
  selectedText?: string;
  initialColor?: string;
  initialNote?: string;
  isEditing?: boolean;
  onHighlight: (color: string, note: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function HighlightPopup({
  x,
  y,
  selectedText,
  initialColor = HIGHLIGHT_COLORS[0].value,
  initialNote = '',
  isEditing = false,
  onHighlight,
  onDelete,
  onCancel,
}: HighlightPopupProps) {
  const [note, setNote] = useState(initialNote);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  const handleSubmit = () => {
    onHighlight(selectedColor, note);
  };

  return (
    <div
      className="fixed bg-white rounded-lg shadow-xl border border-stone-200 p-3 w-64"
      style={{
        left: Math.min(x, window.innerWidth - 280),
        top: Math.min(y + 10, window.innerHeight - 200),
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-stone-700">
          {isEditing ? '하이라이트 수정' : '하이라이트 추가'}
        </span>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-stone-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-stone-400" />
        </button>
      </div>

      {/* Color selection */}
      <div className="flex gap-2 mb-3">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.value}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
              selectedColor === color.value
                ? 'border-stone-800 scale-110'
                : 'border-stone-200'
            )}
            style={{ backgroundColor: color.value }}
            onClick={() => setSelectedColor(color.value)}
            title={color.name}
          />
        ))}
      </div>

      {/* Selected text preview */}
      {selectedText && (
        <div className="mb-3 p-2 bg-stone-50 rounded text-xs text-stone-600 max-h-16 overflow-auto">
          "{selectedText.slice(0, 100)}{selectedText.length > 100 ? '...' : ''}"
        </div>
      )}

      {/* Note input */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="메모 추가 (선택사항)"
        className="w-full p-2 text-sm border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#d97757]/50 focus:border-[#d97757]"
        rows={2}
      />

      {/* Actions */}
      <div className="flex items-center justify-between mt-3">
        {isEditing && onDelete ? (
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 text-sm text-white bg-[#d97757] hover:bg-[#c96747] rounded-lg transition-colors"
          >
            {isEditing ? '수정' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
