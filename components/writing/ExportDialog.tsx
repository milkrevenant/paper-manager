'use client';

import { useState } from 'react';
import { Download, FileText, FileType, FileCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { exportProjectMarkdown } from '@/lib/tauri/commands';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectTitle: string;
}

type ExportFormat = 'markdown' | 'pdf' | 'docx';

export function ExportDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      if (format === 'markdown') {
        const markdown = await exportProjectMarkdown(projectId);

        // Create and download file
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectTitle || 'export'}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onOpenChange(false);
      } else {
        // PDF and DOCX export would require Tauri backend implementation
        alert(`${format.toUpperCase()} export coming soon!`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formats = [
    {
      id: 'markdown' as const,
      label: 'Markdown',
      description: 'Plain text with formatting',
      icon: FileCode,
      available: true,
    },
    {
      id: 'pdf' as const,
      label: 'PDF',
      description: 'Print-ready document',
      icon: FileType,
      available: false,
    },
    {
      id: 'docx' as const,
      label: 'Word',
      description: 'Microsoft Word format',
      icon: FileText,
      available: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="grid grid-cols-3 gap-3">
              {formats.map((f) => (
                <button
                  key={f.id}
                  onClick={() => f.available && setFormat(f.id)}
                  disabled={!f.available}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                    format === f.id
                      ? 'border-[#d97757] bg-[#d97757]/5'
                      : f.available
                      ? 'border-stone-200 hover:border-stone-300'
                      : 'border-stone-100 opacity-50 cursor-not-allowed'
                  )}
                >
                  <f.icon
                    className={cn(
                      'h-6 w-6',
                      format === f.id ? 'text-[#d97757]' : 'text-stone-400'
                    )}
                  />
                  <span className="text-sm font-medium">{f.label}</span>
                  {!f.available && (
                    <span className="text-[10px] text-stone-400">Coming soon</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm text-stone-500 bg-stone-50 p-3 rounded-lg">
            Exporting: <strong>{projectTitle || 'Untitled Project'}</strong>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || !projectId}
            className="bg-[#d97757] hover:bg-[#c86646]"
          >
            {loading ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
