'use client';

import { useState } from 'react';
import { Plus, FileText, Link2, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { WritingProject } from '@/lib/tauri/types';
import { NewProjectDialog } from './NewProjectDialog';

interface ProjectListProps {
  projects: WritingProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (title: string, type: 'standalone' | 'paper-linked') => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}: ProjectListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async (title: string, type: 'standalone' | 'paper-linked') => {
    await onCreateProject(title, type);
    setDialogOpen(false);
  };

  return (
    <div className="h-full flex flex-col border-b border-stone-200">
      <div className="flex items-center justify-between p-3 border-b border-stone-100">
        <h3 className="text-sm font-semibold text-stone-700">Projects</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">
              No projects yet
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group',
                  selectedProjectId === project.id
                    ? 'bg-[#f2f0e9] text-stone-900'
                    : 'hover:bg-stone-50 text-stone-600'
                )}
              >
                {project.type === 'paper-linked' ? (
                  <Link2 className="h-4 w-4 flex-shrink-0 text-[#d97757]" />
                ) : (
                  <FileText className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="flex-1 text-sm truncate">{project.title}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateProject={handleCreate}
      />
    </div>
  );
}
