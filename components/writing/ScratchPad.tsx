'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentEditor } from './DocumentEditor';
import { WordCountDisplay } from './WordCountDisplay';
import { getWordCount } from './editor/useWritingEditor';

const SCRATCH_PAD_KEY = 'writing-scratch-pad';

interface ScratchPadProps {
  onSaveAsDocument?: (content: string) => void;
}

export function ScratchPad({ onSaveAsDocument }: ScratchPadProps) {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCRATCH_PAD_KEY);
      if (saved) {
        setContent(saved);
        setWordCount(getWordCount(saved));
      }
    } catch {
      // localStorage not available (private browsing, etc.)
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage with debounce
  const handleChange = useCallback((newContent: string) => {
    setContent(newContent);
    const count = getWordCount(newContent);
    setWordCount(count);

    // Save to localStorage
    try {
      localStorage.setItem(SCRATCH_PAD_KEY, newContent);
    } catch {
      // localStorage not available or full
    }
  }, []);

  const handleSaveAsDocument = () => {
    if (onSaveAsDocument && content.trim()) {
      onSaveAsDocument(content);
    }
  };

  const handleClear = () => {
    if (confirm('스크래치패드를 비우시겠습니까?')) {
      setContent('');
      setWordCount(0);
      try {
        localStorage.removeItem(SCRATCH_PAD_KEY);
      } catch {
        // localStorage not available
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-stone-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Scratch Pad Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100 bg-stone-50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#d97757]" />
          <span className="text-sm font-medium text-stone-700">스크래치패드</span>
          <span className="text-xs text-stone-400">• 자동 저장됨</span>
        </div>
        <div className="flex items-center gap-2">
          {content.trim() && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 px-2 text-xs text-stone-500 hover:text-stone-700"
              >
                비우기
              </Button>
              {onSaveAsDocument && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsDocument}
                  className="h-7 px-3 text-xs gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  문서로 저장
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <DocumentEditor
          content={content}
          onChange={handleChange}
          onWordCountChange={setWordCount}
          placeholder="여기에 자유롭게 글을 작성하세요. 프로젝트 없이도 바로 시작할 수 있습니다..."
        />
      </div>

      {/* Word Count */}
      <WordCountDisplay wordCount={wordCount} />
    </div>
  );
}
