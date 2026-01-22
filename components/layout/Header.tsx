'use client';

import { Upload, Settings } from 'lucide-react';

interface HeaderProps {
  aiEnabled: boolean;
  onToggleAI: () => void;
}

export function Header({ aiEnabled, onToggleAI }: HeaderProps) {
  return (
    <div className="w-full flex items-center justify-between">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold font-sans text-stone-900 tracking-tight">
          서지관리 <span className="text-stone-400 font-light">| Paper Manager</span>
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* AI Toggle */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-stone-200 shadow-sm">
          <span className="text-xs font-bold font-display text-stone-600 tracking-wide">AI ANALYSIS</span>
          <button
            onClick={onToggleAI}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 ${
              aiEnabled ? 'bg-[#d97757]' : 'bg-stone-300'
            }`}
            role="switch"
            aria-checked={aiEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                aiEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Upload Button */}
        <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors shadow-sm font-medium text-sm">
          <Upload className="w-4 h-4" />
          <span className="font-sans">PDF 업로드</span>
        </button>

        {/* Settings */}
        <button className="p-2.5 bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg transition-colors shadow-sm">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
