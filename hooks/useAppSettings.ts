import React, { useState, useEffect } from 'react';
import { AppSettings, SearchEngine } from '../types';
import { INITIAL_SETTINGS, INITIAL_SEARCH_ENGINES } from '../constants';
import { 
    loadSettings, saveSettings, loadSearchEngines, saveSearchEngines, 
    syncSettingsFromCloud, syncSearchEnginesFromCloud 
} from '../services/storageService';
import { addLog } from '../services/logger';

export const useAppSettings = () => {
  const [settings, setLocalSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(INITIAL_SEARCH_ENGINES);
  const [isDark, setIsDark] = useState(true);

  // Load Settings
  useEffect(() => {
    const init = async () => {
        try {
            const [localSets, localEngines] = await Promise.all([loadSettings(), loadSearchEngines()]);
            if (localSets) setLocalSettings({ ...INITIAL_SETTINGS, ...localSets, socialLinks: localSets.socialLinks || INITIAL_SETTINGS.socialLinks });
            if (localEngines && Array.isArray(localEngines) && localEngines.length > 0) setSearchEngines(localEngines);
            
            // Sync from Cloud
            const [s, e] = await Promise.all([syncSettingsFromCloud(), syncSearchEnginesFromCloud()]);
            if (s) setLocalSettings(p => ({...p, ...s, socialLinks: s.socialLinks || p.socialLinks}));
            if (e && Array.isArray(e) && e.length > 0) setSearchEngines(e);
        } catch (e) {
            console.error(e);
        }
    };
    init();
  }, []);

  // Theme Side Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark);
    
    if (shouldBeDark) {
        root.classList.add('dark');
        setIsDark(true);
    } else {
        root.classList.remove('dark');
        setIsDark(false);
    }
  }, [settings.theme]);

  // Favicon & Title Side Effect
  useEffect(() => {
      document.title = `${settings.appName} | 个人导航`;
      const updateFavicon = () => {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
          if (settings.logoMode === 'image' && settings.customLogoUrl) {
              link.href = settings.customLogoUrl;
          } else {
              const iconName = settings.appIcon || 'Zap';
              const kebabIcon = iconName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
              link.href = `https://unpkg.com/lucide-static@latest/icons/${kebabIcon}.svg`;
          }
      };
      updateFavicon();
  }, [settings.appName, settings.appIcon, settings.logoMode, settings.customLogoUrl]);

  // Actions
  const handleUpdateSettings = (newSettings: AppSettings) => {
      setLocalSettings(newSettings);
      saveSettings(newSettings);
  };

  const handleUpdateEngines = (newEngines: SearchEngine[]) => {
      setSearchEngines(newEngines);
      saveSearchEngines(newEngines);
  };

  const toggleTheme = () => {
      const newTheme = isDark ? 'light' : 'dark';
      handleUpdateSettings({ ...settings, theme: newTheme });
      return newTheme;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg' | 'qr', onSuccess: (msg: string) => void, onError: (msg: string) => void) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { onError('图片大小不能超过 2MB'); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result as string;
          if (type === 'logo') {
              handleUpdateSettings({ ...settings, customLogoUrl: result, logoMode: 'image' });
              onSuccess('Logo 已更新');
          } else if (type === 'bg') {
              handleUpdateSettings({ ...settings, customBackgroundImage: result, backgroundMode: 'custom' });
              onSuccess('背景图已更新');
          }
      };
      reader.readAsDataURL(file);
  };

  return { 
      settings, setLocalSettings, 
      searchEngines, setSearchEngines, 
      isDark, 
      handleUpdateSettings, 
      handleUpdateEngines, 
      toggleTheme,
      handleFileUpload 
  };
};