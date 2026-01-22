'use client';

import { ChevronRight, ChevronDown, Folder, FolderPlus, BookOpen, Plus, Settings, Upload } from 'lucide-react';
import { useState, useRef } from 'react';

interface TopicNode {
  id: string;
  name: string;
  color: string;
  folders: FolderNode[];
  paperCount: number;
}

interface FolderNode {
  id: string;
  name: string;
  paperCount: number;
}

interface TopicsTreeProps {
  onSelectFolder: (topicId: string, folderId: string | null) => void;
  selectedFolderId: string | null;
}

export function TopicsTree({ onSelectFolder, selectedFolderId }: TopicsTreeProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(['all']));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('Selected files:', Array.from(files).map(f => f.name));
      // TODO: Implement actual file upload logic
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Demo data
  const topics: TopicNode[] = [
    {
      id: 'ml',
      name: '머신러닝',
      color: 'blue',
      paperCount: 15,
      folders: [
        { id: 'ml-papers', name: '논문', paperCount: 8 },
        { id: 'ml-review', name: '리뷰', paperCount: 4 },
        { id: 'ml-methods', name: '방법론', paperCount: 3 },
      ],
    },
    {
      id: 'edu',
      name: '교육학',
      color: 'green',
      paperCount: 12,
      folders: [
        { id: 'edu-qual', name: '질적연구', paperCount: 7 },
        { id: 'edu-quant', name: '양적연구', paperCount: 5 },
      ],
    },
  ];

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
        <h2 className="text-sm font-bold text-stone-800 font-sans tracking-tight">라이브러리</h2>
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
          <span className="ml-auto text-xs font-display text-stone-500 font-medium">27</span>
        </div>

        <div className="h-px bg-stone-100 my-2 mx-2" />

        {/* Topics */}
        {topics.map((topic) => (
          <div key={topic.id} className="mb-1">
            {/* Topic */}
            <div className="px-3 py-2 mx-2 rounded-lg hover:bg-stone-50 cursor-pointer flex items-center gap-2 group transition-colors">
              <button
                onClick={() => toggleTopic(topic.id)}
                className="p-0.5 hover:bg-stone-200 rounded transition-colors"
              >
                {expandedTopics.has(topic.id) ? (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600" />
                )}
              </button>
              <BookOpen className={`w-4 h-4 ${colorClasses[topic.color]}`} />
              <span className="text-sm font-medium text-stone-700 font-sans">{topic.name}</span>
              <span className="ml-auto text-xs font-display text-stone-400">{topic.paperCount}</span>
            </div>

            {/* Folders */}
            {expandedTopics.has(topic.id) && (
              <div className="ml-6 mt-1 space-y-0.5">
                {topic.folders.map((folder) => (
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
                    <span className="ml-auto text-xs font-display text-stone-400">{folder.paperCount}</span>
                  </div>
                ))}
                <div
                  className="px-3 py-2 mx-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-stone-50 text-stone-400 transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-sm font-sans">새 폴더</span>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="px-3 py-2 mx-2 rounded-lg hover:bg-stone-50 cursor-pointer flex items-center gap-2 text-stone-500 mt-2 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-sans">새 주제</span>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-stone-200 space-y-3">
        {/* Upload Area */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <div
          onClick={handleUploadClick}
          className="border-2 border-dashed border-stone-200 rounded-lg p-3 hover:bg-stone-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:text-[#d97757] hover:border-[#d97757]/30 group"
        >
            <Upload className="w-5 h-5" />
            <span className="text-xs font-medium">PDF Upload</span>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600">
            US
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-900 truncate">User Name</p>
            <p className="text-xs text-stone-500 truncate">user@example.com</p>
          </div>
          <Settings className="w-4 h-4 text-stone-400" />
        </div>
      </div>
    </div>
  );
}
