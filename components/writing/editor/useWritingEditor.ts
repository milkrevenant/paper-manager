'use client';

import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

interface UseWritingEditorOptions {
  content?: string;
  placeholder?: string;
  editable?: boolean;
  onUpdate?: (content: string) => void;
}

export function useWritingEditor({
  content = '',
  placeholder = 'Start writing...',
  editable = true,
  onUpdate,
}: UseWritingEditorOptions = {}) {
  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false, // Use CodeBlockLowlight instead
      }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: null }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Superscript,
      Subscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#d97757] underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-stone prose-sm sm:prose-base max-w-none focus:outline-none min-h-[500px] px-4 py-2',
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
    },
  });

  return editor;
}

export function getWordCount(text: string): number {
  if (!text) return 0;
  // Remove HTML tags and count words
  const plainText = text.replace(/<[^>]*>/g, ' ').trim();
  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(word => word.length > 0).length;
}

export function getCharacterCount(text: string): number {
  if (!text) return 0;
  // Remove HTML tags and count characters
  const plainText = text.replace(/<[^>]*>/g, '');
  return plainText.length;
}
