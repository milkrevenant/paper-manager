'use client';

import { useEffect, useCallback, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useWritingEditor, getWordCount } from './editor/useWritingEditor';
import { WritingToolbar } from './WritingToolbar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWordCountChange?: (count: number) => void;
  placeholder?: string;
  editable?: boolean;
}

export function DocumentEditor({
  content,
  onChange,
  onWordCountChange,
  placeholder = 'Start writing...',
  editable = true,
}: DocumentEditorProps) {
  const [isDirty, setIsDirty] = useState(false);

  const handleUpdate = useCallback((newContent: string) => {
    setIsDirty(true);
    onChange(newContent);
    if (onWordCountChange) {
      onWordCountChange(getWordCount(newContent));
    }
  }, [onChange, onWordCountChange]);

  const editor = useWritingEditor({
    content,
    placeholder,
    editable,
    onUpdate: handleUpdate,
  });

  // Update content when prop changes (e.g., switching documents)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
      setIsDirty(false);
    }
  }, [editor, content]);

  // Auto-save indicator
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        setIsDirty(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isDirty]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-stone-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <WritingToolbar editor={editor} />
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto py-8">
          <EditorContent editor={editor} />
        </div>
      </ScrollArea>
      {isDirty && (
        <div className="absolute top-2 right-2 text-xs text-stone-400">
          Saving...
        </div>
      )}
    </div>
  );
}
