'use client';

import { useState, ReactNode } from 'react';

interface FourPanelLayoutProps {
  leftPanel1: ReactNode;
  leftPanel2: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  header: ReactNode;
}

export function FourPanelLayout({
  leftPanel1,
  leftPanel2,
  centerPanel,
  rightPanel,
  header,
}: FourPanelLayoutProps) {
  const [widths] = useState({
    left1: 250,
    left2: 320,
    right: 380,
  });

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-slow"></div>
      
      {/* Background decoration with strong blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-400 rounded-full opacity-40 blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-purple-400 rounded-full opacity-40 blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-400 rounded-full opacity-30 blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Header - Strong Glassmorphism */}
      <div className="h-14 backdrop-blur-2xl bg-white/10 border-b border-white/20 shadow-2xl flex-shrink-0 relative z-10">
        {header}
      </div>

      {/* Main 4-panel layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel 1: Topics Tree - Strong Glass */}
        <div 
          className="backdrop-blur-xl bg-white/10 border-r border-white/10 flex-shrink-0 overflow-auto shadow-2xl"
          style={{ width: `${widths.left1}px` }}
        >
          {leftPanel1}
        </div>

        {/* Left Panel 2: Paper List - Strong Glass */}
        <div 
          className="backdrop-blur-xl bg-white/10 border-r border-white/10 flex-shrink-0 overflow-auto shadow-2xl"
          style={{ width: `${widths.left2}px` }}
        >
          {leftPanel2}
        </div>

        {/* Center Panel: PDF Viewer - Medium Glass */}
        <div className="flex-1 backdrop-blur-lg bg-white/5 overflow-auto m-3 rounded-3xl border border-white/20 shadow-2xl">
          {centerPanel}
        </div>

        {/* Right Panel: Metadata - Strong Glass */}
        <div 
          className="backdrop-blur-xl bg-white/10 border-l border-white/10 flex-shrink-0 overflow-auto shadow-2xl"
          style={{ width: `${widths.right}px` }}
        >
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
