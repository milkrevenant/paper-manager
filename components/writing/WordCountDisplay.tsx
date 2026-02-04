'use client';

import { Clock, FileText, Target } from 'lucide-react';

interface WordCountDisplayProps {
  wordCount: number;
  characterCount?: number;
  targetWordCount?: number | null;
  sessionWordCount?: number;
}

export function WordCountDisplay({
  wordCount,
  characterCount,
  targetWordCount,
  sessionWordCount,
}: WordCountDisplayProps) {
  const progress = targetWordCount ? Math.min(100, (wordCount / targetWordCount) * 100) : 0;

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-t border-stone-200 bg-stone-50 text-xs text-stone-500">
      <div className="flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        <span>
          <strong className="text-stone-700">{wordCount.toLocaleString()}</strong> words
        </span>
      </div>

      {characterCount !== undefined && (
        <div className="flex items-center gap-1.5">
          <span>
            <strong className="text-stone-700">{characterCount.toLocaleString()}</strong> characters
          </span>
        </div>
      )}

      {targetWordCount && (
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5" />
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d97757] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {sessionWordCount !== undefined && sessionWordCount > 0 && (
        <div className="flex items-center gap-1.5 ml-auto">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Session: <strong className="text-green-600">+{sessionWordCount}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
