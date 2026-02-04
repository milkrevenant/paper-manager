'use client';

import { useState } from 'react';
import { FileText, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (title: string, type: 'standalone' | 'paper-linked') => Promise<void>;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: NewProjectDialogProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'standalone' | 'paper-linked'>('standalone');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onCreateProject(title.trim(), type);
      setTitle('');
      setType('standalone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Writing Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Research Paper"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Project Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType('standalone')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  type === 'standalone'
                    ? 'border-[#d97757] bg-[#d97757]/5'
                    : 'border-stone-200 hover:border-stone-300'
                )}
              >
                <FileText className={cn(
                  'h-8 w-8',
                  type === 'standalone' ? 'text-[#d97757]' : 'text-stone-400'
                )} />
                <span className="text-sm font-medium">Standalone</span>
                <span className="text-xs text-stone-500">Independent writing project</span>
              </button>

              <button
                onClick={() => setType('paper-linked')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  type === 'paper-linked'
                    ? 'border-[#d97757] bg-[#d97757]/5'
                    : 'border-stone-200 hover:border-stone-300'
                )}
              >
                <Link2 className={cn(
                  'h-8 w-8',
                  type === 'paper-linked' ? 'text-[#d97757]' : 'text-stone-400'
                )} />
                <span className="text-sm font-medium">Paper-Linked</span>
                <span className="text-xs text-stone-500">Connected to a paper</span>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || loading}
            className="bg-[#d97757] hover:bg-[#c86646]"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
