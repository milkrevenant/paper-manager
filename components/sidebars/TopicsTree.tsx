'use client';

import { ChevronRight, Folder, FolderPlus, BookOpen, Plus, Settings, Upload, Loader2 } from 'lucide-react';
import { useState, useEffect, ReactNode, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { isTauri, openPdfDialog } from '@/lib/tauri/commands';
import { useTopics } from '@/hooks/useTopics';
import { useFolders } from '@/hooks/useFolders';
import type { Paper } from '@/lib/tauri/types';

// Animated collapsible component using CSS grid trick for smooth height animation
function Collapsible({ isOpen, children }: { isOpen: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
    >
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}

interface TopicsTreeProps {
  onSelectFolder: (topicId: string, folderId: string | null) => void;
  selectedFolderId: string | null;
  onImportPdfs?: (filePaths: string[]) => Promise<void>;
  isImporting?: boolean;
  allPapers: Paper[];
}

export function TopicsTree({
  onSelectFolder,
  selectedFolderId,
  onImportPdfs,
  isImporting = false,
  allPapers = [],
}: TopicsTreeProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(['all']));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tauriStatus, setTauriStatus] = useState(false);

  // Check Tauri status after mount to avoid hydration mismatch
  useEffect(() => {
    setTauriStatus(isTauri());
  }, []);

  // Fetch real data from DB
  const { topics } = useTopics();
  const { folders } = useFolders();

  // Calculate paper counts
  const totalPaperCount = allPapers.length;

  const paperCountByFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const paper of allPapers) {
      counts[paper.folderId] = (counts[paper.folderId] || 0) + 1;
    }
    return counts;
  }, [allPapers]);

  const paperCountByTopic = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const folder of folders) {
      const folderCount = paperCountByFolder[folder.id] || 0;
      counts[folder.topicId] = (counts[folder.topicId] || 0) + folderCount;
    }
    return counts;
  }, [folders, paperCountByFolder]);

  const handleUploadClick = async () => {
    console.log('[TopicsTree] Upload clicked, isTauri:', isTauri(), 'onImportPdfs:', !!onImportPdfs);
    if (!isTauri() || !onImportPdfs) {
      console.log('[TopicsTree] Early return - Tauri:', isTauri(), 'onImportPdfs:', !!onImportPdfs);
      return;
    }

    try {
      console.log('[TopicsTree] Opening PDF dialog...');
      const paths = await openPdfDialog();
      console.log('[TopicsTree] Dialog result:', paths);
      if (paths && paths.length > 0) {
        await onImportPdfs(paths);
      }
    } catch (error) {
      console.error('[TopicsTree] Dialog error:', error);
    }
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="py-2 px-3 border-b border-stone-200 flex items-center justify-between min-h-[60px]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-stone-800 font-sans tracking-tight">라이브러리</h2>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium",
            tauriStatus ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {tauriStatus ? 'Tauri' : 'Web'}
          </span>
        </div>
        <button className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-600 hover:text-stone-900">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-2">
        {/* All Papers */}
        <div
          onClick={() => onSelectFolder('all', null)}
          className={`px-3 py-2 mx-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
            selectedFolderId === null 
              ? 'bg-[#f2f0e9] text-stone-900 font-medium' 
              : 'hover:bg-stone-50 text-stone-600'
          }`}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-sans">모든 논문</span>
          <span className="ml-auto text-xs font-display text-stone-500 font-medium">{totalPaperCount}</span>
        </div>

        <div className="h-px bg-stone-100 my-2 mx-2" />

        {/* Topics */}
        {topics.map((topic) => {
          const topicFolders = folders.filter(f => f.topicId === topic.id);
          const topicPaperCount = paperCountByTopic[topic.id] || 0;

          return (
            <div key={topic.id} className="mb-1">
              {/* Topic */}
              <div className="px-3 py-2 mx-2 rounded-lg hover:bg-stone-50 cursor-pointer flex items-center gap-2 group transition-colors">
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="p-0.5 hover:bg-stone-200 rounded transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 transition-transform duration-200",
                      expandedTopics.has(topic.id) && "rotate-90"
                    )}
                  />
                </button>
                <BookOpen className={`w-4 h-4 ${colorClasses[topic.color]}`} />
                <span className="text-sm font-medium text-stone-700 font-sans">{topic.name}</span>
                <span className="ml-auto text-xs font-display text-stone-400">{topicPaperCount}</span>
              </div>

              {/* Folders with animation */}
              <Collapsible isOpen={expandedTopics.has(topic.id)}>
                <div className="ml-6 mt-1 space-y-0.5">
                  {topicFolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => onSelectFolder(topic.id, folder.id)}
                      className={`px-3 py-2 mx-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors ${
                        selectedFolderId === folder.id
                          ? 'bg-[#f2f0e9] text-stone-900 font-medium'
                          : 'hover:bg-stone-50 text-stone-600'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-sm font-sans">{folder.name}</span>
                      <span className="ml-auto text-xs font-display text-stone-400">{paperCountByFolder[folder.id] || 0}</span>
                    </div>
                  ))}
                  <div
                    className="px-3 py-2 mx-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-stone-50 text-stone-400 transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-sm font-sans">새 폴더</span>
                  </div>
                </div>
              </Collapsible>
            </div>
          );
        })}

        <div className="px-3 py-2 mx-2 rounded-lg hover:bg-stone-50 cursor-pointer flex items-center gap-2 text-stone-500 mt-2 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-sans">새 주제</span>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-stone-200 space-y-3">
        {/* Upload Area */}
        <div
          onClick={handleUploadClick}
          className={cn(
            "border-2 border-dashed border-stone-200 rounded-lg p-3 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5",
            isImporting
              ? "bg-stone-50 text-stone-400 cursor-wait"
              : "hover:bg-stone-50 text-stone-400 hover:text-[#d97757] hover:border-[#d97757]/30"
          )}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">가져오는 중...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span className="text-xs font-medium">PDF Upload</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600">
            US
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-900 truncate">User Name</p>
            <p className="text-xs text-stone-500 truncate">user@example.com</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen(true);
            }}
            className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
