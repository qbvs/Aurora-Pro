
import React from 'react';
import { Home, AlertCircle } from 'lucide-react';
import { Category, SocialLink } from '../../types';
import { Icon } from '../Icon';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { cn } from '../../utils';

interface PublicSidebarProps {
  clock: Date;
  greetingTime: string;
  dateInfo: string;
  weatherInfo: { icon: string; text: string } | 'loading' | 'error' | null;
  categories: Category[];
  viewCategory: string | null;
  setViewCategory: (id: string | null) => void;
  uniqueLinkCount: number;
  socialLinks: SocialLink[];
  onShowQr: (url: string) => void;
}

const COMMON_REC_ID = 'rec-1';

export const PublicSidebar: React.FC<PublicSidebarProps> = ({
  clock,
  greetingTime,
  dateInfo,
  weatherInfo,
  categories,
  viewCategory,
  setViewCategory,
  uniqueLinkCount,
  socialLinks,
  onShowQr
}) => {
  return (
      <aside className="hidden lg:flex w-64 shrink-0 flex-col pb-10 sticky top-28 h-[calc(100vh-140px)]">
          <div className="mb-8 p-6 rounded-3xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/5 shadow-xl dark:shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 dark:from-cyan-500/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center select-none cursor-default">
                <div className="flex items-baseline">
                  <div className="text-5xl font-bold text-slate-800 dark:text-white tracking-tight">
                    {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}
                  </div>
                  <div className="ml-2 text-2xl font-medium text-slate-400">
                    {String(clock.getSeconds()).padStart(2, '0')}
                  </div>
                </div>

                <div className="mt-4 text-lg font-medium text-cyan-600 dark:text-cyan-400">
                  {greetingTime}好
                </div>

                <div className="mt-2 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span>{dateInfo}</span>
                    {weatherInfo && <>
                        <span className="opacity-50">•</span>
                        <div className="flex items-center gap-1.5">
                            {(() => {
                                if (weatherInfo === 'loading') {
                                    return <><LoadingSpinner /> <span className="text-xs">加载天气...</span></>;
                                }
                                if (weatherInfo === 'error') {
                                    return <><AlertCircle size={16} className="text-amber-500 dark:text-amber-400"/> <span className="text-xs">获取失败</span></>;
                                }
                                if (typeof weatherInfo === 'object') {
                                    return <><Icon name={weatherInfo.icon} size={16} /> <span>{weatherInfo.text}</span></>;
                                }
                                return null;
                            })()}
                        </div>
                    </>}
                </div>
              </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
              <button 
                  onClick={() => setViewCategory(null)} 
                  className={cn("w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-sm font-bold group relative overflow-hidden", 
                      !viewCategory 
                        ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-md shadow-cyan-900/5 dark:shadow-cyan-900/20 backdrop-blur-md border border-slate-100 dark:border-white/5" 
                        : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  )}
              >
                  <div className={cn("transition-transform group-hover:scale-110 duration-200", !viewCategory ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500")}><Home size={20}/></div>
                  <span className="flex-1 text-left">总览</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-mono", !viewCategory ? "bg-white/20 text-current" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>{uniqueLinkCount}</span>
                  {!viewCategory && <div className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"/>}
              </button>

              <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent opacity-50"/>

              {(categories || []).map(cat => (
                  <button key={cat.id} onClick={() => setViewCategory(cat.id)} className={cn("w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all text-sm font-medium group relative", 
                      viewCategory === cat.id 
                        ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-md backdrop-blur-md border border-slate-100 dark:border-white/5" 
                        : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  )}>
                      <div className={cn("transition-transform group-hover:scale-110 duration-200", viewCategory === cat.id ? "text-cyan-600 dark:text-cyan-400" : cat.id === COMMON_REC_ID ? "text-orange-500 dark:text-orange-400" : "text-slate-400 dark:text-slate-500")}><Icon name={cat.icon} size={18}/></div>
                      <span className="flex-1 truncate text-left">{cat.title}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-mono transition-colors", viewCategory === cat.id ? "bg-white/20 text-current" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>{cat.links.length}</span>
                  </button>
              ))}
          </nav>
          
          <div className="mt-auto pt-6 flex gap-3 flex-wrap">
              {(socialLinks || []).map(link => (
                 <a key={link.id} href={link.qrCode ? undefined : link.url} onClick={(e) => { if(link.qrCode) { e.preventDefault(); onShowQr(link.qrCode); }}} target={link.qrCode ? undefined : "_blank"} className="p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-cyan-900/10 dark:hover:shadow-cyan-900/20 hover:-translate-y-1 transition-all duration-300" title={link.platform} aria-label={link.platform}><Icon name={link.icon} size={18}/></a>
              ))}
          </div>
      </aside>
  );
};
