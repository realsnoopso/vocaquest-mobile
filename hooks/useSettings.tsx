import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { UserSettings } from '@/lib/types';
import * as queries from '@/lib/queries';

const DEFAULT_SETTINGS: UserSettings = {
  user_id: '',
  quiz_interval_minutes: 30,
  sound_enabled: true,
  notifications_enabled: true,
  meaning_display: 'both',
  quiz_type: 'multiple-choice',
  created_at: '',
  updated_at: '',
};

interface SettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  update: (updates: Partial<UserSettings>) => Promise<UserSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queries.getSettings().then((data) => {
      if (data) setSettings(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = useCallback(async (updates: Partial<UserSettings>) => {
    const updated = await queries.updateSettings(updates);
    setSettings(updated);
    return updated;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
