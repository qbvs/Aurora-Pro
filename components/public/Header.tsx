
import React from 'react';
import { Search, Sun, Moon, Settings, Menu, Download } from 'lucide-react';
import { AppSettings, SearchEngine } from '../../types';
import { Icon } from '../Icon';
import { Favicon } from '../Favicon';
import { cn } from '../../utils';
import { usePWA } from '../../hooks/usePWA';
import { useI18n } from '../../hooks/useI18n';

interface HeaderProps {
  settings: AppSettings;
  searchEngines: SearchEngine[];
  onUpdateSettings: (s: AppSettings) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  isAuthenticated: boolean;
  onOpenLogin: () => void;
  onEnterEditMode: () => void;
  uniqueLinkCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  searchEngines,
  onUpdateSettings,
  searchTerm,
  setSearchTerm,
  isDark,
  toggleTheme,
  isAuthenticated,
  onOpenLogin,
  onEnterEditMode,
  uniqueLinkCount
}) => {
  const { isInstallable, installPWA } = usePWA();
  const { t } = useI18n(settings.language);
  
  const activeEngine = searchEngines?.find(e => e.id === settings.activeSearchEngineId) 
    || searchEngines?.[0] 
    || { id: 'fallback', name: 'Google', baseUrl: 'https://google.com', searchUrlPattern: 'https://google.com/search?q=' };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-6 lg:px-12 py-5 flex items-center justify-between bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-3">
          {settings.logoMode === 'icon' ? (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Icon name={settings.appIcon} size={20}/>
            </div>
          ) : (
            settings.customLogoUrl && <img src={settings.customLogoUrl} className="w-10 h-10 rounded-2xl object-contain bg-white/10 shadow-sm" alt="Logo"/>
          )}
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{settings.appName}</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)] dark:shadow-[0_0_10px_rgba(34,211,238,0.5)]"/> 
              {t('header.online')} <span className="opacity-50">|</span> {t('header.collected')} {uniqueLinkCount}
            </p>
          </div>
        </div>
        <button className="md:hidden p-2 text-slate-600 dark:text-slate-400" aria-label="打开菜单"><Menu size={20}/></button>
      </div>

      <div className="flex-1 max-w-xl mx-4 relative group">
        <div className="absolute inset-y-0 left-4 flex items-center gap-3 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">
          <Search size={18}/>
        </div>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          onKeyDown={(e) => { 
            if (e.key === 'Enter' && searchTerm.trim()) {
              window.open(activeEngine.searchUrlPattern + encodeURIComponent(searchTerm), settings.openInNewTab ? '_blank' : '_self');
              setSearchTerm(''); 
            }
          }} 
          className="w-full h-11 pl-12 pr-4 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 focus:bg-white dark:focus:bg-slate-900/80 focus:border-cyan-500/30 dark:focus:border-cyan-500/50 shadow-inner focus:shadow-lg focus:shadow-cyan-500/10 outline-none text-sm font-medium transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 backdrop-blur-md" 
          placeholder={t('header.searchPlaceholder')}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-1">
          {(searchEngines || []).slice(0, 3).map(engine => (
            <button 
              key={engine.id} 
              onClick={() => onUpdateSettings({...settings, activeSearchEngineId: engine.id})} 
              className={cn(
                "p-1.5 rounded-lg transition-all", 
                settings.activeSearchEngineId === engine.id 
                  ? "bg-white dark:bg-cyan-500/20 shadow-sm text-cyan-600 dark:text-cyan-300 opacity-100 scale-110 border border-slate-200 dark:border-cyan-500/30" 
                  : "opacity-40 hover:opacity-80 hover:bg-white/50 dark:hover:bg-white/10 text-slate-400"
              )}
            >
              <Favicon url={engine.baseUrl} size={14} className="rounded-full grayscale hover:grayscale-0 transition-all"/>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isInstallable && (
            <button 
                onClick={installPWA}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 hover:bg-cyan-500 hover:scale-105 active:scale-95 transition-all mr-2 animate-fade-in"
                title={t('common.install')}
            >
                <Download size={14} /> {t('common.install')}
            </button>
        )}

        <button onClick={toggleTheme} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-amber-500 dark:hover:text-yellow-300 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5" aria-label="切换主题">
          {isDark ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
        <button 
          onClick={() => isAuthenticated ? onEnterEditMode() : onOpenLogin()} 
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5" 
          aria-label="设置"
        >
          <Settings size={20}/>
        </button>
      </div>
    </header>
  );
};
