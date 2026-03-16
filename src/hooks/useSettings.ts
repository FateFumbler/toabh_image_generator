import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultModel: 'flux' | 'gemini';
  defaultResolution: '1k' | '2k' | '4k';
  defaultAspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  defaultFormat: 'png' | 'jpg' | 'webp';
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultModel: 'flux',
  defaultResolution: '1k',
  defaultAspectRatio: '1:1',
  defaultFormat: 'png',
};

const STORAGE_KEY = 'toabh_settings';

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setLoaded(true);
  }, []);

  // Save settings to localStorage and apply theme
  const setSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!loaded) return;
    
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const root = document.documentElement;
      
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
          root.classList.toggle('dark', e.matches);
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
    };

    const cleanup = applyTheme(settings.theme);
    return cleanup;
  }, [settings.theme, loaded]);

  return { settings, setSettings, loaded };
}

// Get display values for settings
export const RESOLUTION_OPTIONS = [
  { value: '1k', label: '1K (1024px)' },
  { value: '2k', label: '2K (2048px)' },
  { value: '4k', label: '4K (4096px)' },
];

export const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Widescreen' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '3:4', label: '3:4 Portrait' },
];

export const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
];

export const MODEL_OPTIONS = [
  { value: 'flux', label: 'FLUX 2 Pro' },
  { value: 'gemini', label: 'Gemini' },
];
