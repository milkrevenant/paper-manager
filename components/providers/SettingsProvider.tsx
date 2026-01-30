'use client';

import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { settings, loading } = useSettings();

  // This component just applies settings via CSS variables
  // The actual application happens in the useSettings hook

  return <>{children}</>;
}
