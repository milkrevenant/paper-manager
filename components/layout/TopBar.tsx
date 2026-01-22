'use client';

import { useState } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
  ChevronDown,
  PanelLeft,
  PanelRight,
  Columns3,
  Type,
  Palette,
  Highlighter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface TopBarProps {
  panelVisibility: {
    panel1: boolean;
    panel2: boolean;
    panel3: boolean;
    panel4: boolean;
  };
  onTogglePanel: (panel: 'panel1' | 'panel2' | 'panel3' | 'panel4') => void;
}

const fontSizes = ['10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
const fontFamilies = [
  { label: '기본', value: 'sans-serif' },
  { label: '명조', value: 'serif' },
  { label: '고딕', value: 'system-ui' },
  { label: '모노스페이스', value: 'monospace' },
];

const colors = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

export function TopBar({ panelVisibility, onTogglePanel }: TopBarProps) {
  const [fontSize, setFontSize] = useState('12');
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [fontColor, setFontColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');

  const ToolButton = ({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-stone-100 transition-colors ${active ? 'bg-stone-200 text-stone-900' : 'text-stone-600'}`}
    >
      {children}
    </button>
  );

  const ColorPicker = ({ value, onChange, icon: Icon }: { value: string; onChange: (color: string) => void; icon: any }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-1.5 rounded hover:bg-stone-100 transition-colors text-stone-600 flex items-center gap-0.5">
          <Icon className="w-4 h-4" />
          <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: value }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-10 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`w-5 h-5 rounded border border-stone-200 hover:scale-110 transition-transform ${value === color ? 'ring-2 ring-[#d97757] ring-offset-1' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="h-10 bg-white border-b border-stone-200 flex items-center px-3 gap-1 shrink-0">
      {/* Text Formatting */}
      <div className="flex items-center gap-0.5">
        <ToolButton>
          <Bold className="w-4 h-4" />
        </ToolButton>
        <ToolButton>
          <Italic className="w-4 h-4" />
        </ToolButton>
        <ToolButton>
          <Underline className="w-4 h-4" />
        </ToolButton>
        <ToolButton>
          <Strikethrough className="w-4 h-4" />
        </ToolButton>
      </div>

      <Separator orientation="vertical" className="h-5 mx-2" />

      {/* Font Family */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-7 px-2 rounded hover:bg-stone-100 transition-colors text-stone-600 flex items-center gap-1 text-xs font-medium min-w-[80px] justify-between border border-stone-200">
            <Type className="w-3.5 h-3.5" />
            <span className="truncate">
              {fontFamilies.find(f => f.value === fontFamily)?.label || '기본'}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {fontFamilies.map((font) => (
            <DropdownMenuItem
              key={font.value}
              onClick={() => setFontFamily(font.value)}
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font Size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-7 px-2 rounded hover:bg-stone-100 transition-colors text-stone-600 flex items-center gap-1 text-xs font-medium min-w-[50px] justify-between border border-stone-200">
            <span>{fontSize}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[200px] overflow-auto">
          {fontSizes.map((size) => (
            <DropdownMenuItem key={size} onClick={() => setFontSize(size)}>
              {size}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 mx-2" />

      {/* Colors */}
      <div className="flex items-center gap-0.5">
        <ColorPicker value={fontColor} onChange={setFontColor} icon={Palette} />
        <ColorPicker value={highlightColor} onChange={setHighlightColor} icon={Highlighter} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Panel Toggle Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTogglePanel('panel1')}
          className={`h-7 px-2 gap-1.5 text-xs ${panelVisibility.panel1 ? 'text-stone-700' : 'text-stone-400'}`}
        >
          <PanelLeft className="w-4 h-4" />
          <span className="hidden sm:inline">라이브러리</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTogglePanel('panel2')}
          className={`h-7 px-2 gap-1.5 text-xs ${panelVisibility.panel2 ? 'text-stone-700' : 'text-stone-400'}`}
        >
          <Columns3 className="w-4 h-4" />
          <span className="hidden sm:inline">논문목록</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTogglePanel('panel3')}
          className={`h-7 px-2 gap-1.5 text-xs ${panelVisibility.panel3 ? 'text-stone-700' : 'text-stone-400'}`}
        >
          <Columns3 className="w-4 h-4" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTogglePanel('panel4')}
          className={`h-7 px-2 gap-1.5 text-xs ${panelVisibility.panel4 ? 'text-stone-700' : 'text-stone-400'}`}
        >
          <PanelRight className="w-4 h-4" />
          <span className="hidden sm:inline">메타데이터</span>
        </Button>
      </div>
    </div>
  );
}
