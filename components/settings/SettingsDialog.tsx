'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, FolderOpen, Check, Loader2 } from 'lucide-react';
import {
  getSettings,
  setSetting,
  isTauri,
  openDirectoryDialog,
} from '@/lib/tauri/commands';
import type { AppSettings } from '@/lib/tauri/types';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fontFamilies = [
  { value: 'system', label: 'System Default' },
  { value: 'noto-sans-kr', label: 'Noto Sans KR' },
  { value: 'pretendard', label: 'Pretendard' },
  { value: 'ibm-plex-sans-kr', label: 'IBM Plex Sans KR' },
  { value: 'spoqa-han-sans', label: 'Spoqa Han Sans' },
];

const fontSizes = [
  { value: '12', label: '12px' },
  { value: '14', label: '14px (Default)' },
  { value: '16', label: '16px' },
  { value: '18', label: '18px' },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AppSettings>({
    geminiApiKey: null,
    openaiApiKey: null,
    defaultFontFamily: null,
    defaultFontSize: null,
    storagePath: null,
    googleAccountEmail: null,
  });
  const [loading, setLoading] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (open && isTauri()) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    if (!isTauri()) return;

    setSaving(key);
    try {
      await setSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value || null }));
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    } finally {
      setTimeout(() => setSaving(null), 500);
    }
  };

  const handleSelectStoragePath = async () => {
    if (!isTauri()) return;

    try {
      const selected = await openDirectoryDialog('Select Storage Directory');

      if (selected) {
        await handleSaveSetting('storagePath', selected);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  const maskApiKey = (key: string | null): string => {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Settings</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* General Settings */}
            <section>
              <h3 className="text-sm font-semibold text-stone-700 mb-3">General</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-stone-600">Default Font</label>
                  <Select
                    value={settings.defaultFontFamily || 'system'}
                    onValueChange={(value) => handleSaveSetting('defaultFontFamily', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-stone-600">Font Size</label>
                  <Select
                    value={settings.defaultFontSize || '14'}
                    onValueChange={(value) => handleSaveSetting('defaultFontSize', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizes.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator />

            {/* AI Settings */}
            <section>
              <h3 className="text-sm font-semibold text-stone-700 mb-3">AI Integration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-stone-600">Gemini API Key</label>
                  <div className="relative">
                    <Input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={showGeminiKey ? (settings.geminiApiKey || '') : maskApiKey(settings.geminiApiKey)}
                      onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                      onBlur={(e) => {
                        if (e.target.value !== maskApiKey(settings.geminiApiKey)) {
                          handleSaveSetting('geminiApiKey', e.target.value);
                        }
                      }}
                      placeholder="Enter your Gemini API key"
                      className="pr-20"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {saving === 'geminiApiKey' && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                      >
                        {showGeminiKey ? (
                          <EyeOff className="w-4 h-4 text-stone-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-stone-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-stone-600">OpenAI API Key</label>
                  <div className="relative">
                    <Input
                      type={showOpenaiKey ? 'text' : 'password'}
                      value={showOpenaiKey ? (settings.openaiApiKey || '') : maskApiKey(settings.openaiApiKey)}
                      onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      onBlur={(e) => {
                        if (e.target.value !== maskApiKey(settings.openaiApiKey)) {
                          handleSaveSetting('openaiApiKey', e.target.value);
                        }
                      }}
                      placeholder="Enter your OpenAI API key"
                      className="pr-20"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {saving === 'openaiApiKey' && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      >
                        {showOpenaiKey ? (
                          <EyeOff className="w-4 h-4 text-stone-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-stone-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Storage Settings */}
            <section>
              <h3 className="text-sm font-semibold text-stone-700 mb-3">Storage</h3>
              <div className="space-y-2">
                <label className="text-sm text-stone-600">Offline Storage Path</label>
                <div className="flex gap-2">
                  <Input
                    value={settings.storagePath || ''}
                    readOnly
                    placeholder="Default location"
                    className="flex-1 bg-stone-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSelectStoragePath}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-stone-400">
                  PDFs and database will be stored in this location
                </p>
              </div>
            </section>

            <Separator />

            {/* Google Account */}
            <section>
              <h3 className="text-sm font-semibold text-stone-700 mb-3">Connected Account</h3>
              <div className="space-y-3">
                {settings.googleAccountEmail ? (
                  <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {settings.googleAccountEmail[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-700">
                          {settings.googleAccountEmail}
                        </p>
                        <p className="text-xs text-stone-400">Google Account</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveSetting('googleAccountEmail', '')}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // TODO: Implement Google OAuth
                      console.log('Connect Google Account');
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Connect Google Account
                  </Button>
                )}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
