'use client';

import type { Highlight } from '@/lib/tauri/types';

interface HighlightLayerProps {
  pageNumber: number;
  highlights: Highlight[];
  onHighlightClick?: (highlight: Highlight) => void;
}

export function HighlightLayer({
  pageNumber,
  highlights,
  onHighlightClick,
}: HighlightLayerProps) {
  const pageHighlights = highlights.filter((h) => h.pageNumber === pageNumber);

  if (pageHighlights.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {pageHighlights.map((highlight) => (
        <div key={highlight.id}>
          {highlight.rects.map((rect, i) => (
            <div
              key={i}
              className="absolute pointer-events-auto cursor-pointer hover:opacity-50 transition-opacity"
              style={{
                top: `${rect.top}%`,
                left: `${rect.left}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                backgroundColor: highlight.color,
                opacity: 0.35,
                mixBlendMode: 'multiply',
              }}
              onClick={() => onHighlightClick?.(highlight)}
              title={highlight.note || highlight.selectedText.slice(0, 50)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
