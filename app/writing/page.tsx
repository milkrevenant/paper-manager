'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  PanelLeft,
  PanelRight,
  Download,
  Maximize2,
  Minimize2,
  FolderTree,
  Table2,
  Search,
  PenLine,
} from 'lucide-react';
import Link from 'next/link';

import { ProjectList } from '@/components/writing/ProjectList';
import { DocumentTree } from '@/components/writing/DocumentTree';
import { DocumentEditor } from '@/components/writing/DocumentEditor';
import { InspectorPanel } from '@/components/writing/InspectorPanel';
import { WordCountDisplay } from '@/components/writing/WordCountDisplay';
import { ExportDialog } from '@/components/writing/ExportDialog';
import { ScratchPad } from '@/components/writing/ScratchPad';

import { useWritingStore } from '@/store/useWritingStore';
import { useWritingProjects } from '@/hooks/useWritingProjects';
import { useWritingDocuments } from '@/hooks/useWritingDocuments';
import { getWordCount } from '@/components/writing/editor/useWritingEditor';
import { isTauri } from '@/lib/tauri/commands';

export default function WritingPage() {
  const {
    selectedProjectId,
    selectedDocumentId,
    isBinderVisible,
    isInspectorVisible,
    isFocusMode,
    setSelectedProject,
    setSelectedDocument,
    toggleBinder,
    toggleInspector,
    toggleFocusMode,
  } = useWritingStore();

  const {
    projects,
    createWritingProject,
    deleteWritingProject,
  } = useWritingProjects();

  const {
    documents,
    documentTree,
    createWritingDocument,
    updateWritingDocument,
    updateDocumentContent,
    deleteWritingDocument,
  } = useWritingDocuments(selectedProjectId);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Check if mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get selected document
  const selectedDocument = documents.find((d) => d.id === selectedDocumentId) || null;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Auto-select first document when project changes
  useEffect(() => {
    if (selectedProjectId && documentTree.length > 0 && !selectedDocumentId) {
      setSelectedDocument(documentTree[0].id);
    }
  }, [selectedProjectId, documentTree, selectedDocumentId, setSelectedDocument]);

  const handleCreateProject = async (title: string, type: 'standalone' | 'paper-linked') => {
    const project = await createWritingProject({ title, type });
    setSelectedProject(project.id);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Delete this project and all its documents?')) {
      await deleteWritingProject(projectId);
      if (selectedProjectId === projectId) {
        setSelectedProject(null);
      }
    }
  };

  const handleCreateDocument = useCallback(
    async (parentId: string | null, contentType: 'text' | 'folder') => {
      if (!selectedProjectId) return;
      const title = contentType === 'folder' ? 'New Folder' : 'New Document';
      const doc = await createWritingDocument({
        projectId: selectedProjectId,
        parentId: parentId ?? undefined,
        title,
        contentType,
      });
      setSelectedDocument(doc.id);
    },
    [selectedProjectId, createWritingDocument, setSelectedDocument]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === '\\') {
        e.preventDefault();
        if (e.shiftKey) {
          toggleInspector();
        } else {
          toggleBinder();
        }
      }

      if (isMod && e.key === 'e' && !e.shiftKey) {
        e.preventDefault();
        toggleFocusMode();
      }

      if (isMod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        if (selectedProjectId) {
          handleCreateDocument(null, 'text');
        }
      }

      if (isMod && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        if (selectedProjectId) {
          handleCreateDocument(null, 'folder');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProjectId, toggleBinder, toggleInspector, toggleFocusMode, handleCreateDocument]);

  const handleDeleteDocument = async (documentId: string) => {
    if (confirm('Delete this document?')) {
      await deleteWritingDocument(documentId);
      if (selectedDocumentId === documentId) {
        setSelectedDocument(null);
      }
    }
  };

  const handleEditorChange = useCallback(
    (content: string) => {
      if (selectedDocumentId) {
        const count = getWordCount(content);
        setWordCount(count);
        updateDocumentContent(selectedDocumentId, content, count);
      }
    },
    [selectedDocumentId, updateDocumentContent]
  );

  // Save scratch pad content to a new project/document
  const handleSaveFromScratchPad = async (content: string) => {
    try {
      // Create a new project for the scratch pad content
      const project = await createWritingProject({
        title: '스크래치패드에서 저장됨',
        type: 'standalone',
      });
      setSelectedProject(project.id);

      // Create document without content first
      const doc = await createWritingDocument({
        projectId: project.id,
        title: 'Untitled',
        contentType: 'text',
      });

      // Then update with content
      const wordCountVal = getWordCount(content);
      await updateWritingDocument(doc.id, {
        content,
        wordCount: wordCountVal,
      });

      setSelectedDocument(doc.id);

      // Clear scratch pad after saving
      try {
        localStorage.removeItem('writing-scratch-pad');
      } catch {
        // localStorage not available
      }
    } catch (error) {
      console.error('Failed to save scratch pad:', error);
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // Wait for client-side mount before checking Tauri
  if (!isMounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-400">Loading...</div>
      </div>
    );
  }

  // Check if running in Tauri (only after mounted)
  if (!isTauri()) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-800">Writing Workspace</h1>
          <p className="text-stone-500">This feature requires the desktop app.</p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#faf9f5]">
      {/* Top Navigation Bar - Same level as other pages */}
      <div className="h-10 bg-white border-b border-stone-200 flex items-center px-3 gap-1 shrink-0">
        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <Link href="/search">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs text-[#d97757] hover:text-[#c46647] hover:bg-[#d97757]/10"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">논문 검색</span>
            </Button>
          </Link>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs text-stone-600 hover:text-stone-900"
            >
              <FolderTree className="w-4 h-4" />
              <span className="hidden sm:inline">라이브러리</span>
            </Button>
          </Link>

          <Link href="/table">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs text-stone-600 hover:text-stone-900"
            >
              <Table2 className="w-4 h-4" />
              <span className="hidden sm:inline">테이블 뷰</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5 text-xs text-stone-700 bg-stone-100"
            disabled
          >
            <PenLine className="w-4 h-4" />
            <span className="hidden sm:inline">Writing</span>
          </Button>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Project Title */}
        <span className="text-sm font-medium text-stone-700 truncate max-w-[200px]">
          {selectedProject?.title || 'Writing Workspace'}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Writing Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBinder}
            className={`h-7 px-2 ${!isBinderVisible ? 'text-stone-400' : 'text-stone-700'}`}
            title="Toggle Binder (Cmd+\\)"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleInspector}
            className={`h-7 px-2 ${!isInspectorVisible ? 'text-stone-400' : 'text-stone-700'}`}
            title="Toggle Inspector (Cmd+Shift+\\)"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFocusMode}
            className="h-7 px-2"
            title="Focus Mode (Cmd+E)"
          >
            {isFocusMode ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={!selectedProjectId}
            className="h-7 px-2 gap-1.5 text-xs"
            title="Export"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal">
          {/* Left Panel - Binder */}
          <ResizablePanel
            defaultSize={isBinderVisible ? 20 : 0}
            minSize={isBinderVisible ? 15 : 0}
            maxSize={30}
            collapsible
            collapsedSize={0}
            className={isBinderVisible ? 'bg-white border-r border-stone-200' : ''}
          >
            {isBinderVisible && (
              <div className="h-full flex flex-col">
                <ProjectList
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={setSelectedProject}
                  onCreateProject={handleCreateProject}
                  onDeleteProject={handleDeleteProject}
                />
                {selectedProjectId && (
                  <DocumentTree
                    documents={documentTree}
                    allDocuments={documents}
                    selectedDocumentId={selectedDocumentId}
                    onSelectDocument={setSelectedDocument}
                    onCreateDocument={handleCreateDocument}
                    onDeleteDocument={handleDeleteDocument}
                  />
                )}
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle withHandle className={isBinderVisible ? '' : 'hidden'} />

          {/* Center Panel - Editor */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full flex flex-col">
              {selectedDocument && selectedDocument.contentType === 'text' ? (
                <>
                  <div className="flex-1 min-h-0">
                    <DocumentEditor
                      content={selectedDocument.content}
                      onChange={handleEditorChange}
                      onWordCountChange={setWordCount}
                    />
                  </div>
                  <WordCountDisplay
                    wordCount={wordCount || selectedDocument.wordCount}
                    targetWordCount={selectedDocument.targetWordCount}
                  />
                </>
              ) : selectedDocument?.contentType === 'folder' ? (
                <div className="h-full flex items-center justify-center bg-stone-50">
                  <div className="text-center space-y-2">
                    <p className="text-stone-400">
                      폴더입니다. 문서를 선택해주세요.
                    </p>
                  </div>
                </div>
              ) : (
                // Show ScratchPad when no document is selected
                <ScratchPad onSaveAsDocument={handleSaveFromScratchPad} />
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className={isInspectorVisible ? '' : 'hidden'} />

          {/* Right Panel - Inspector */}
          <ResizablePanel
            defaultSize={isInspectorVisible ? 25 : 0}
            minSize={isInspectorVisible ? 20 : 0}
            maxSize={35}
            collapsible
            collapsedSize={0}
          >
            {isInspectorVisible && (
              <InspectorPanel
                document={selectedDocument}
                onUpdate={updateWritingDocument}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        projectId={selectedProjectId}
        projectTitle={selectedProject?.title || ''}
      />
    </div>
  );
}
