'use client';

import { useState } from 'react';
import {
  X,
  Trash2,
  FolderInput,
  Tag,
  Star,
  BookOpen,
  FileDown,
  CheckSquare,
  Loader2,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Folder } from '@/lib/tauri/types';
import { CitationDialog } from '@/components/citation/CitationDialog';

interface BatchActionsBarProps {
  selectedCount: number;
  selectedPaperIds: string[];
  folders: Folder[];
  allTags: string[];
  onClearSelection: () => void;
  onDelete: () => Promise<void>;
  onMoveToFolder: (folderId: string) => Promise<void>;
  onAddTags: (tags: string[]) => Promise<void>;
  onRemoveTags: (tags: string[]) => Promise<void>;
  onSetImportance: (importance: number) => Promise<void>;
  onMarkAsRead: (isRead: boolean) => Promise<void>;
  onExportCitations: (format: 'bibtex' | 'ris') => Promise<void>;
}

export function BatchActionsBar({
  selectedCount,
  selectedPaperIds,
  folders,
  allTags,
  onClearSelection,
  onDelete,
  onMoveToFolder,
  onAddTags,
  onRemoveTags,
  onSetImportance,
  onMarkAsRead,
  onExportCitations,
}: BatchActionsBarProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [citationDialogOpen, setCitationDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`${selectedCount}개 논문을 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveToFolder = async (folderId: string) => {
    setIsMoving(true);
    try {
      await onMoveToFolder(folderId);
    } finally {
      setIsMoving(false);
    }
  };

  const handleExport = async (format: 'bibtex' | 'ris') => {
    setIsExporting(true);
    try {
      await onExportCitations(format);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      onAddTags([tagInput.trim()]);
      setTagInput('');
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full shadow-2xl">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-stone-700">
          <CheckSquare className="w-4 h-4 text-[#d97757]" />
          <span className="text-sm font-medium">{selectedCount}개 선택됨</span>
        </div>

        {/* Move to folder */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isMoving}
              className="text-white hover:bg-stone-800 gap-1.5"
            >
              {isMoving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderInput className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">이동</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[200px]">
            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() => handleMoveToFolder(folder.id)}
              >
                {folder.name}
              </DropdownMenuItem>
            ))}
            {folders.length === 0 && (
              <DropdownMenuItem disabled>폴더 없음</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tags */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-stone-800 gap-1.5"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">태그</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[200px]">
            <div className="px-2 py-1.5">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="새 태그..."
                  className="flex-1 px-2 py-1 text-sm border rounded"
                />
                <Button size="sm" onClick={handleAddTag} className="h-7">
                  추가
                </Button>
              </div>
            </div>
            {allTags.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>기존 태그 추가</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {allTags.slice(0, 10).map((tag) => (
                      <DropdownMenuItem
                        key={tag}
                        onClick={() => onAddTags([tag])}
                      >
                        {tag}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>태그 제거</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {allTags.slice(0, 10).map((tag) => (
                      <DropdownMenuItem
                        key={tag}
                        onClick={() => onRemoveTags([tag])}
                      >
                        {tag}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Importance */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-stone-800 gap-1.5"
            >
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">중요도</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {[1, 2, 3, 4, 5].map((importance) => (
              <DropdownMenuItem
                key={importance}
                onClick={() => onSetImportance(importance)}
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-3 h-3',
                        i < importance
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300'
                      )}
                    />
                  ))}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSetImportance(0)}>
              중요도 제거
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Read status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-stone-800 gap-1.5"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">읽음</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => onMarkAsRead(true)}>
              읽음으로 표시
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMarkAsRead(false)}>
              읽지 않음으로 표시
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Citation */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCitationDialogOpen(true)}
          className="text-[#d97757] hover:bg-[#d97757]/20 gap-1.5"
        >
          <Quote className="w-4 h-4" />
          <span className="hidden sm:inline">인용</span>
        </Button>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isExporting}
              className="text-white hover:bg-stone-800 gap-1.5"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">내보내기</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => handleExport('bibtex')}>
              BibTeX 내보내기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('ris')}>
              RIS 내보내기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 gap-1.5"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">삭제</span>
        </Button>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-stone-400 hover:text-white hover:bg-stone-800 ml-1"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Citation Dialog */}
      <CitationDialog
        open={citationDialogOpen}
        onOpenChange={setCitationDialogOpen}
        paperIds={selectedPaperIds}
      />
    </div>
  );
}
