
import React from 'react';
import { Sun, Moon, Monitor, Cloud, LayoutGrid, Image as ImageIcon, Upload } from 'lucide-react';
import { AppSettings } from '../../../types';
import { cn } from '../../../utils';

interface AppearanceSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'bg') => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ settings, onUpdateSettings, onFileUpload }) => {
  return (
      <div className="space-y-6 animate-fade-in text-slate-200">
          <h2 className="text-2xl font-bold mb-6">外观效果</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-3">
                   <label className="block text-sm font-bold text-slate-400 mb-4">色彩模式</label>
                   <div className="grid grid-cols-3 gap-4">
                       {[
                           {id: 'light', label: '浅色', icon: Sun},
                           {id: 'dark', label: '深色', icon: Moon},
                           {id: 'system', label: '跟随系统', icon: Monitor}
                       ].map(t => (
                           <button key={t.id} onClick={() => onUpdateSettings({...settings, theme: t.id as any})} className={cn("flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all", settings.theme === t.id ? "bg-cyan-900/20 border-cyan-500/50 text-cyan-400" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300")}>
                               <t.icon size={24}/>
                               <span className="text-sm font-bold">{t.label}</span>
                           </button>
                       ))}
                   </div>
               </div>

               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-3">
                   <label className="block text-sm font-bold text-slate-400 mb-4">背景风格</label>
                   <div className="grid grid-cols-3 gap-4 mb-6">
                       {[
                           {id: 'aurora', label: '极光流体', icon: Cloud},
                           {id: 'monotone', label: '简约单色', icon: LayoutGrid},
                           {id: 'custom', label: '自定义图片', icon: ImageIcon}
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
                                     <Upload size={18}/> 上传背景图
                                     <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'bg')}/>
                                 </label>
                             </div>
                        </div>
                   )}

                   <div className="space-y-6">
                       <div>
                           <div className="flex justify-between mb-2"><span className="text-sm font-bold text-slate-400">卡片透明度</span><span className="text-sm font-mono text-cyan-400">{settings.cardOpacity}%</span></div>
                           <input type="range" min="20" max="100" value={settings.cardOpacity} onChange={(e) => onUpdateSettings({...settings, cardOpacity: parseInt(e.target.value)})} className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/>
                       </div>
                       <div>
                           <div className="flex justify-between mb-2"><span className="text-sm font-bold text-slate-400">背景模糊度</span><span className="text-sm font-mono text-cyan-400">{settings.backgroundBlur || 0}px</span></div>
                           <input type="range" min="0" max="50" value={settings.backgroundBlur || 0} onChange={(e) => onUpdateSettings({...settings, backgroundBlur: parseInt(e.target.value)})} className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/>
                       </div>
                   </div>
               </div>
               
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-white">AI 每日寄语</h3>
                            <p className="text-xs text-slate-500 mt-1">在主页显示来自 AI 生成的每日问候和格言</p>
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
