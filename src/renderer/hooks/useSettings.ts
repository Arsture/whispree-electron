import { useEffect, useState } from 'react';
import { defaultAppSettings, type AppSettingsSnapshot, type AppSettingsUpdate } from '../../shared/settings';

export interface UseSettingsResult {
  readonly settings: AppSettingsSnapshot;
  readonly isLoaded: boolean;
  readonly updateSettings: (update: AppSettingsUpdate) => Promise<void>;
  readonly resetSettings: () => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettingsSnapshot>(defaultAppSettings);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void window.whispree.getSettings().then((nextSettings) => {
      if (mounted) {
        setSettings(nextSettings);
        setLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function updateSettings(update: AppSettingsUpdate): Promise<void> {
    const result = await window.whispree.updateSettings(update);
    if (result.ok) setSettings(result.settings);
  }

  async function resetSettings(): Promise<void> {
    const result = await window.whispree.resetSettings();
    if (result.ok) setSettings(result.settings);
  }

  return { settings, isLoaded, updateSettings, resetSettings };
}
