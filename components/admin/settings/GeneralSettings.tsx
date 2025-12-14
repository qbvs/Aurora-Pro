
import React, { useState } from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { AppSettings } from '../../../types';
import { Icon } from '../../Icon';
import { suggestIcon } from '../../../services/geminiService';
import { cn } from '../../../utils';

interface GeneralSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg' | 'qr') => void;
}

const LoadingSpinner = () => <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />;

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdateSettings, onFileUpload }) => {
  const [isIconSuggesting, setIsIconSuggesting] = useState(false);

  const handleAiSuggestIcon = async () => {
    const seedText = (settings.appIcon && settings.appIcon.trim() !== '' && settings.appIcon !== 'Zap') ? settings.appIcon : settings.appName;
    if (!seedText) return;
    setIsIconSuggesting(true);
    try {
        const icon = await suggestIcon(seedText);
        onUpdateSettings({...settings, appIcon: icon});
    } finally {
        setIsIconSuggesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
        <h2 className="text-2xl font-bold mb-6">基础设置</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                     <label className="block text-sm font-bold text-slate-400 mb-3">网站标题</label>
                     <input value={settings.appName} onChange={(e) => onUpdateSettings({...settings, appName: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 transition-colors text-white"/>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                     <label className="block text-sm font-bold text-slate-400 mb-3">网站图标 (Lucide Icon)</label>
                     <div className="flex gap-2">
                         <div className="flex-1 relative">
                             <input value={settings.appIcon} onChange={(e) => onUpdateSettings({...settings, appIcon: e.target.value})} className="w-full p-3 pl-12 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 transition-colors text-white"/>
                             <div className="absolute left-3 top-3 text-slate-500"><Icon name={settings.appIcon} size={24}/></div>
                         </div>
                         <button onClick={handleAiSuggestIcon} disabled={isIconSuggesting} className="px-4 py-2 bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded-xl font-bold hover:bg-cyan-900/50 transition-all flex items-center gap-2 disabled:opacity-50">
                             {isIconSuggesting ? <LoadingSpinner/> : <Sparkles size={18}/>} AI 推荐
                         </button>
                     </div>
                </div>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                 <div>
                     <label className="block text-sm font-bold text-slate-400 mb-3">Logo 模式</label>
                     <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                         <button onClick={() => onUpdateSettings({...settings, logoMode: 'icon'})} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", settings.logoMode === 'icon' ? "bg-slate-800 text-cyan-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}>图标</button>
                         <button onClick={() => onUpdateSettings({...settings, logoMode: 'image'})} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", settings.logoMode === 'image' ? "bg-slate-800 text-cyan-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}>图片</button>
                     </div>
                 </div>
                 {settings.logoMode === 'image' && (
                     <div>
                         <label className="block text-sm font-bold text-slate-400 mb-3">上传 Logo</label>
                         <div className="flex items-center gap-4">
                             {settings.customLogoUrl && <img src={settings.customLogoUrl} className="w-12 h-12 rounded-lg object-contain bg-white/5" alt="Custom Logo"/>}
                             <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 rounded-xl hover:border-cyan-500 hover:text-cyan-400 transition-all text-slate-500 text-sm font-bold">
                                 <Upload size={18}/> 选择图片
                                 <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'logo')}/>
                             </label>
                         </div>
                     </div>
                 )}
            </div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-white">新标签页打开链接</h3>
                    <p className="text-xs text-slate-500 mt-1">点击链接时是否在浏览器新标签页中打开</p>
                </div>
                <button onClick={() => onUpdateSettings({...settings, openInNewTab: !settings.openInNewTab})} className={cn("w-12 h-6 rounded-full relative transition-colors", settings.openInNewTab ? "bg-cyan-600" : "bg-slate-700")}>
                    <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", settings.openInNewTab ? "left-7" : "left-1")}/>
                </button>
            </div>
        </div>
    </div>
  );
};
