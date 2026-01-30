'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSettings, isTauri } from '@/lib/tauri/commands';
import type { AppSettings } from '@/lib/tauri/types';

const defaultSettings: AppSettings = {
  geminiApiKey: null,
  openaiApiKey: null,
  defaultFontFamily: 'system',
  defaultFontSize: '14',
  storagePath: null,
  googleAccountEmail: null,
};

// Font family CSS mapping
const fontFamilyMap: Record<string, string> = {
  'system': 'var(--font-sans)',
  'noto-sans-kr': '"Noto Sans KR", sans-serif',
  'pretendard': '"Pretendard", sans-serif',
  'ibm-plex-sans-kr': '"IBM Plex Sans KR", sans-serif',
  'spoqa-han-sans': '"Spoqa Han Sans Neo", sans-serif',
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }

    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply font settings to document
  const applyFontSettings = useCallback((fontFamily: string | null, fontSize: string | null) => {
    const root = document.documentElement;

    // Apply font family
    const fontValue = fontFamilyMap[fontFamily || 'system'] || fontFamilyMap['system'];
    root.style.setProperty('--app-font-family', fontValue);

    // Apply font size
    const sizeValue = fontSize || '14';
    root.style.setProperty('--app-font-size', `${sizeValue}px`);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Apply font settings when they change
  useEffect(() => {
    if (!loading) {
      applyFontSettings(settings.defaultFontFamily, settings.defaultFontSize);
    }
  }, [loading, settings.defaultFontFamily, settings.defaultFontSize, applyFontSettings]);

  return {
    settings,
    loading,
    refresh: loadSettings,
  };
}
