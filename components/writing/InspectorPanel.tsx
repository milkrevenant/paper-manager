'use client';

import { useState, useEffect } from 'react';
import { Info, StickyNote, Tag, Target, CheckCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { WritingDocument, UpdateWritingDocumentInput } from '@/lib/tauri/types';

interface InspectorPanelProps {
  document: WritingDocument | null;
  onUpdate: (documentId: string, input: UpdateWritingDocumentInput) => void;
}

export function InspectorPanel({ document, onUpdate }: InspectorPanelProps) {
  const [synopsis, setSynopsis] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('todo');
  const [targetWordCount, setTargetWordCount] = useState<string>('');

  // Update local state when document changes
  useEffect(() => {
    if (document) {
      setSynopsis(document.synopsis || '');
      setNotes(document.notes || '');
      setStatus(document.status || 'todo');
      setTargetWordCount(document.targetWordCount?.toString() || '');
    }
  }, [document?.id]);

  // Debounced save for text fields
  useEffect(() => {
    if (!document) return;

    const timer = setTimeout(() => {
      if (synopsis !== document.synopsis) {
        onUpdate(document.id, { synopsis });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [synopsis, document, onUpdate]);

  useEffect(() => {
    if (!document) return;

    const timer = setTimeout(() => {
      if (notes !== document.notes) {
        onUpdate(document.id, { notes });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, document, onUpdate]);

  const handleStatusChange = (newStatus: string) => {
    if (!document) return;
    setStatus(newStatus);
    onUpdate(document.id, { status: newStatus as UpdateWritingDocumentInput['status'] });
  };

  const handleTargetChange = (value: string) => {
    setTargetWordCount(value);
    if (!document) return;

    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      onUpdate(document.id, { targetWordCount: num });
    } else if (value === '') {
      onUpdate(document.id, { targetWordCount: null });
    }
  };

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-50/50">
        <div className="text-center space-y-2">
          <Info className="h-8 w-8 text-stone-300 mx-auto" />
          <p className="text-sm text-stone-400">Select a document to view details</p>
        </div>
      </div>
    );
  }

  const wordProgress = document.targetWordCount
    ? Math.min(100, (document.wordCount / document.targetWordCount) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-3 border-b border-stone-200">
        <h3 className="text-sm font-semibold text-stone-700">Inspector</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Document Title */}
          <div>
            <h4 className="text-lg font-medium text-stone-900 truncate">
              {document.title || 'Untitled'}
            </h4>
            <p className="text-xs text-stone-400 mt-1">
              {document.contentType === 'folder' ? 'Folder' : 'Document'}
            </p>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Status
            </Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="first-draft">First Draft</SelectItem>
                <SelectItem value="revised">Revised</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Word Count */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Word Count
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-stone-900">
                {document.wordCount.toLocaleString()}
              </span>
              {document.targetWordCount && (
                <span className="text-sm text-stone-400">
                  / {document.targetWordCount.toLocaleString()}
                </span>
              )}
            </div>
            {document.targetWordCount && (
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#d97757] transition-all"
                  style={{ width: `${wordProgress}%` }}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Target"
                value={targetWordCount}
                onChange={(e) => handleTargetChange(e.target.value)}
                className="h-8"
              />
              <span className="text-xs text-stone-400">words</span>
            </div>
          </div>

          <Separator />

          {/* Synopsis */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Synopsis
            </Label>
            <Textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Brief summary of this section..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes..."
              className="min-h-[100px] resize-none bg-amber-50"
            />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Labels
            </Label>
            <div className="flex flex-wrap gap-1">
              {document.labels.length > 0 ? (
                document.labels.map((label) => (
                  <Badge key={label} variant="secondary">
                    {label}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-stone-400">No labels</span>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
