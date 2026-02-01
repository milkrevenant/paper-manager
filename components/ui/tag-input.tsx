'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  allTags?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  tags = [],
  onChange,
  allTags = [],
  placeholder = '태그 추가...',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get suggestions based on input
  const suggestions = inputValue.trim()
    ? allTags
        .filter(
          (tag) =>
            tag.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(tag)
        )
        .slice(0, 8)
    : [];

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim();
      if (trimmedTag && !tags.includes(trimmedTag)) {
        onChange([...tags, trimmedTag]);
      }
      setInputValue('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.trim().length > 0);
    setSelectedIndex(-1);
  };

  // Tag colors for visual variety
  const tagColors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-yellow-100 text-yellow-700 border-yellow-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
  ];

  const getTagColor = (tag: string) => {
    const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return tagColors[hash % tagColors.length];
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 p-2 min-h-[42px] border rounded-lg bg-white/50 transition-colors',
          'focus-within:ring-2 focus-within:ring-[#d97757]/20 focus-within:border-[#d97757]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
              getTagColor(tag)
            )}
          >
            <Tag className="w-3 h-3" />
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.trim() && setShowSuggestions(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-stone-400"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors',
                index === selectedIndex
                  ? 'bg-[#d97757]/10 text-[#d97757]'
                  : 'hover:bg-stone-50 text-stone-700'
              )}
            >
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Create new tag hint */}
      {inputValue.trim() && !suggestions.includes(inputValue.trim()) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors',
                index === selectedIndex
                  ? 'bg-[#d97757]/10 text-[#d97757]'
                  : 'hover:bg-stone-50 text-stone-700'
              )}
            >
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              {suggestion}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            className={cn(
              'w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors border-t border-stone-100',
              selectedIndex === suggestions.length || (selectedIndex === -1 && suggestions.length === 0)
                ? 'bg-[#d97757]/10 text-[#d97757]'
                : 'hover:bg-stone-50 text-stone-700'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              새 태그 &quot;{inputValue.trim()}&quot; 추가
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
