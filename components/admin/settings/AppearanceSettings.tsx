
import React from 'react';
import { Sun, Moon, Monitor, Cloud, LayoutGrid, Image as ImageIcon, Upload, Download, Palette, Share2 } from 'lucide-react';
import { AppSettings, ThemeConfig } from '../../../types';
import { cn } from '../../../utils';
import { useI18n } from '../../../hooks/useI18n';

interface AppearanceSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'bg') => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ settings, onUpdateSettings, onFileUpload }) => {
  const { t } = useI18n(settings.language);

  // 预设主题
  const presetThemes: ThemeConfig[] = [
      {
          name: 'Cyberpunk',
          settings: { theme: 'dark', backgroundMode: 'monotone', cardOpacity: 90, backgroundBlur: 0, backgroundMaskOpacity: 0 }
      },
      {
          name: 'Aurora',
          settings: { theme: 'dark', backgroundMode: 'aurora', cardOpacity: 60, backgroundBlur: 10, backgroundMaskOpacity: 10 }
      },
      {
          name: 'Clean White',
          settings: { theme: 'light', backgroundMode: 'monotone', cardOpacity: 95, backgroundBlur: 0, backgroundMaskOpacity: 0 }
      }
  ];

  const handleExportTheme = () => {
      const themeConfig: ThemeConfig = {
          name: `${settings.appName} Theme`,
          settings: {
              theme: settings.theme,
              backgroundMode: settings.backgroundMode,
              customBackgroundImage: settings.customBackgroundImage,
              cardOpacity: settings.cardOpacity,
              backgroundBlur: settings.backgroundBlur,
              backgroundMaskOpacity: settings.backgroundMaskOpacity
          }
      };
      const blob = new Blob([JSON.stringify(themeConfig, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aurora-theme-${Date.now()}.json`;
      a.click();
  };

  const handleImportTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const theme = JSON.parse(ev.target?.result as string) as ThemeConfig;
              if (theme.settings) {
                  onUpdateSettings({ ...settings, ...theme.settings });
                  alert(`主题 "${theme.name}" 应用成功`);
              }
          } catch (err) {
              alert('主题文件格式错误');
          }
      };
      reader.readAsText(file);
  };

  return (
      <div className="space-y-6 animate-fade-in text-slate-200">
          <h2 className="text-2xl font-bold mb-6">{t('settings.title_appearance')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* 色彩模式 */}
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-3">
                   <label className="block text-sm font-bold text-slate-400 mb-4">Color Mode</label>
                   <div className="grid grid-cols-3 gap-4">
                       {[
                           {id: 'light', label: 'Light', icon: Sun},
                           {id: 'dark', label: 'Dark', icon: Moon},
                           {id: 'system', label: 'System', icon: Monitor}
                       ].map(t => (
                           <button key={t.id} onClick={() => onUpdateSettings({...settings, theme: t.id as any})} className={cn("flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all", settings.theme === t.id ? "bg-cyan-900/20 border-cyan-500/50 text-cyan-400" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300")}>
                               <t.icon size={24}/>
                               <span className="text-sm font-bold">{t.label}</span>
                           </button>
                       ))}
                   </div>
               </div>

               {/* 背景设置 */}
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-3">
                   <label className="block text-sm font-bold text-slate-400 mb-4">{t('settings.bg_style')}</label>
                   <div className="grid grid-cols-3 gap-4 mb-6">
                       {[
                           {id: 'aurora', label: 'Aurora', icon: Cloud},
                           {id: 'monotone', label: 'Solid', icon: LayoutGrid},
                           {id: 'custom', label: 'Image', icon: ImageIcon}
                       ].map(m => (
                           <button key={m.id} onClick={() => onUpdateSettings({...settings, backgroundMode: m.id as any})} className={cn("flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all", settings.backgroundMode === m.id ? "bg-cyan-900/20 border-cyan-500/50 text-cyan-400" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300")}>
                               <m.icon size={24}/>
                               <span className="text-sm font-bold">{m.label}</span>
                           </button>
                       ))}
                   </div>
                   
                   {settings.backgroundMode === 'custom' && (
                        <div className="mb-6">
                             <div className="flex items-center gap-4">
                                 {settings.customBackgroundImage && <div className="w-20 h-12 rounded-lg bg-cover bg-center border border-slate-700" style={{backgroundImage: `url(${settings.customBackgroundImage})`}}/>}
                                 <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 rounded-xl hover:border-cyan-500 hover:text-cyan-400 transition-all text-slate-500 text-sm font-bold">
                                     <Upload size={18}/> {t('settings.bg_upload')}
                                     <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'bg')}/>
                                 </label>
                             </div>
                        </div>
                   )}

                   <div className="space-y-6">
                       <div>
                           <div className="flex justify-between mb-2"><span className="text-sm font-bold text-slate-400">{t('settings.card_opacity')}</span><span className="text-sm font-mono text-cyan-400">{settings.cardOpacity}%</span></div>
                           <input type="range" min="20" max="100" value={settings.cardOpacity} onChange={(e) => onUpdateSettings({...settings, cardOpacity: parseInt(e.target.value)})} className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/>
                       </div>
                       <div>
                           <div className="flex justify-between mb-2"><span className="text-sm font-bold text-slate-400">{t('settings.bg_blur')}</span><span className="text-sm font-mono text-cyan-400">{settings.backgroundBlur || 0}px</span></div>
                           <input type="range" min="0" max="50" value={settings.backgroundBlur || 0} onChange={(e) => onUpdateSettings({...settings, backgroundBlur: parseInt(e.target.value)})} className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/>
                       </div>
                   </div>
               </div>
               
               {/* 主题市场 */}
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-3">
                   <div className="flex items-center gap-2 mb-4">
                       <Palette className="text-purple-400" size={20}/>
                       <h3 className="font-bold text-slate-200">{t('settings.theme_market')}</h3>
                   </div>
                   <p className="text-xs text-slate-500 mb-4">{t('settings.theme_export_desc')}</p>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        {presetThemes.map(theme => (
                            <button 
                                key={theme.name}
                                onClick={() => onUpdateSettings({...settings, ...theme.settings})}
                                className="p-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 hover:border-purple-500/30 text-left transition-all group"
                            >
                                <div className="text-sm font-bold text-slate-300 group-hover:text-purple-400">{theme.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1">Preset</div>
                            </button>
                        ))}
                   </div>

                   <div className="flex gap-4">
                       <button onClick={handleExportTheme} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 hover:text-cyan-400 transition-all font-bold text-sm text-slate-400">
                           <Share2 size={16}/> {t('common.export')} JSON
                       </button>
                       <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition-all font-bold text-sm text-slate-400 cursor-pointer">
                           <Download size={16}/> {t('common.import')} JSON
                           <input type="file" accept=".json" className="hidden" onChange={handleImportTheme}/>
                       </label>
                   </div>
               </div>

               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-white">{t('settings.ai_greeting')}</h3>
                            <p className="text-xs text-slate-500 mt-1">Daily AI generated quote on homepage</p>
                        </div>
                        <button onClick={() => onUpdateSettings({...settings, enableAiGreeting: !settings.enableAiGreeting})} className={cn("w-12 h-6 rounded-full relative transition-colors", settings.enableAiGreeting ? "bg-cyan-600" : "bg-slate-700")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", settings.enableAiGreeting ? "left-7" : "left-1")}/>
                        </button>
                    </div>
               </div>
          </div>
      </div>
  );
};
