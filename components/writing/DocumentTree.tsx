'use client';

import { useState } from 'react';
import { ChevronRight, FileText, Folder, FolderPlus, FilePlus, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { WritingDocument } from '@/lib/tauri/types';

interface DocumentTreeProps {
  documents: WritingDocument[];
  allDocuments: WritingDocument[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onCreateDocument: (parentId: string | null, contentType: 'text' | 'folder') => void;
  onDeleteDocument: (documentId: string) => void;
}

function DocumentNode({
  document,
  allDocuments,
  selectedDocumentId,
  level,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
}: {
  document: WritingDocument;
  allDocuments: WritingDocument[];
  selectedDocumentId: string | null;
  level: number;
  onSelectDocument: (documentId: string) => void;
  onCreateDocument: (parentId: string | null, contentType: 'text' | 'folder') => void;
  onDeleteDocument: (documentId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(document.isExpanded);

  const children = allDocuments
    .filter((d) => d.parentId === document.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const hasChildren = children.length > 0;
  const isFolder = document.contentType === 'folder';
  const isSelected = selectedDocumentId === document.id;

  const statusColors: Record<string, string> = {
    'todo': 'bg-stone-300',
    'in-progress': 'bg-blue-400',
    'first-draft': 'bg-yellow-400',
    'revised': 'bg-orange-400',
    'done': 'bg-green-400',
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer group',
          isSelected ? 'bg-[#f2f0e9] text-stone-900' : 'hover:bg-stone-50 text-stone-600'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelectDocument(document.id)}
      >
        {(hasChildren || isFolder) ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-stone-200 rounded"
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 text-stone-400 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}

        {isFolder ? (
          <Folder className="h-4 w-4 flex-shrink-0 text-[#d97757]" />
        ) : (
          <FileText className="h-4 w-4 flex-shrink-0" />
        )}

        <span className="flex-1 text-sm truncate">{document.title || 'Untitled'}</span>

        <div
          className={cn('w-2 h-2 rounded-full', statusColors[document.status] || 'bg-stone-300')}
          title={document.status}
        />

        <span className="text-xs text-stone-400 mr-1">{document.wordCount}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreateDocument(document.id, 'text')}>
              <FilePlus className="h-4 w-4 mr-2" />
              New Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateDocument(document.id, 'folder')}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => onDeleteDocument(document.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <DocumentNode
              key={child.id}
              document={child}
              allDocuments={allDocuments}
              selectedDocumentId={selectedDocumentId}
              level={level + 1}
              onSelectDocument={onSelectDocument}
              onCreateDocument={onCreateDocument}
              onDeleteDocument={onDeleteDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentTree({
  documents,
  allDocuments,
  selectedDocumentId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
}: DocumentTreeProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-stone-100">
        <h3 className="text-sm font-semibold text-stone-700">Binder</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onCreateDocument(null, 'text')}
            title="New Document"
          >
            <FilePlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onCreateDocument(null, 'folder')}
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">
              No documents
            </div>
          ) : (
            documents.map((doc) => (
              <DocumentNode
                key={doc.id}
                document={doc}
                allDocuments={allDocuments}
                selectedDocumentId={selectedDocumentId}
                level={0}
                onSelectDocument={onSelectDocument}
                onCreateDocument={onCreateDocument}
                onDeleteDocument={onDeleteDocument}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
