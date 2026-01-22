'use client';

import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DynamicListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export function DynamicList({ items = [], onChange, placeholder }: DynamicListProps) {
  const handleAdd = () => {
    onChange([...items, '']);
  };

  const handleChangeItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => handleChangeItem(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-white/50 focus:bg-white"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(index)}
            className="h-9 w-9 text-stone-400 hover:text-red-500 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full border-dashed text-stone-500 hover:text-[#d97757] hover:border-[#d97757]/30 hover:bg-[#d97757]/5"
      >
        <Plus className="h-3.5 w-3.5 mr-2" />
        Add Item
      </Button>
    </div>
  );
}
