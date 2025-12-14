
import React, { useState } from 'react';
import { Upload, Sparkles, Languages } from 'lucide-react';
import { AppSettings } from '../../../types';
import { Icon } from '../../Icon';
import { suggestIcon } from '../../../services/geminiService';
import { cn } from '../../../utils';
import { useI18n } from '../../../hooks/useI18n';

interface GeneralSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg' | 'qr') => void;
}

const LoadingSpinner = () => <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />;

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdateSettings, onFileUpload }) => {
  const [isIconSuggesting, setIsIconSuggesting] = useState(false);
  const { t } = useI18n(settings.language);

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
        <h2 className="text-2xl font-bold mb-6">{t('settings.title_general')}</h2>
        
        {/* 语言设置 */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
             <label className="block text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                 <Languages size={16} /> {t('settings.language')}
             </label>
             <div className="grid grid-cols-3 gap-4">
                 {[
                     {id: 'zh', label: '简体中文'},
                     {id: 'en', label: 'English'},
                     {id: 'ja', label: '日本語'}
                 ].map(lang => (
                     <button 
                        key={lang.id} 
                        onClick={() => onUpdateSettings({...settings, language: lang.id as any})}
                        className={cn(
                            "py-3 rounded-xl border font-bold text-sm transition-all",
                            settings.language === lang.id 
                                ? "bg-cyan-600 text-white border-cyan-500 shadow-md" 
                                : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                        )}
                     >
                         {lang.label}
                     </button>
                 ))}
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                     <label className="block text-sm font-bold text-slate-400 mb-3">{t('settings.site_title')}</label>
                     <input value={settings.appName} onChange={(e) => onUpdateSettings({...settings, appName: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 transition-colors text-white"/>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                     <label className="block text-sm font-bold text-slate-400 mb-3">{t('settings.site_icon')}</label>
                     <div className="flex gap-2">
                         <div className="flex-1 relative">
                             <input value={settings.appIcon} onChange={(e) => onUpdateSettings({...settings, appIcon: e.target.value})} className="w-full p-3 pl-12 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 transition-colors text-white"/>
                             <div className="absolute left-3 top-3 text-slate-500"><Icon name={settings.appIcon} size={24}/></div>
                         </div>
                         <button onClick={handleAiSuggestIcon} disabled={isIconSuggesting} className="px-4 py-2 bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded-xl font-bold hover:bg-cyan-900/50 transition-all flex items-center gap-2 disabled:opacity-50">
                             {isIconSuggesting ? <LoadingSpinner/> : <Sparkles size={18}/>} AI
                         </button>
                     </div>
                </div>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                 <div>
                     <label className="block text-sm font-bold text-slate-400 mb-3">{t('settings.logo_mode')}</label>
                     <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                         <button onClick={() => onUpdateSettings({...settings, logoMode: 'icon'})} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", settings.logoMode === 'icon' ? "bg-slate-800 text-cyan-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}>Icon</button>
                         <button onClick={() => onUpdateSettings({...settings, logoMode: 'image'})} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", settings.logoMode === 'image' ? "bg-slate-800 text-cyan-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}>Image</button>
                     </div>
                 </div>
                 {settings.logoMode === 'image' && (
                     <div>
                         <label className="block text-sm font-bold text-slate-400 mb-3">{t('common.edit')} Logo</label>
                         <div className="flex items-center gap-4">
                             {settings.customLogoUrl && <img src={settings.customLogoUrl} className="w-12 h-12 rounded-lg object-contain bg-white/5" alt="Custom Logo"/>}
                             <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 rounded-xl hover:border-cyan-500 hover:text-cyan-400 transition-all text-slate-500 text-sm font-bold">
                                 <Upload size={18}/> {t('common.import')}
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
                    <h3 className="font-bold text-white">Open in New Tab</h3>
                    <p className="text-xs text-slate-500 mt-1">Target _blank behavior</p>
                </div>
                <button onClick={() => onUpdateSettings({...settings, openInNewTab: !settings.openInNewTab})} className={cn("w-12 h-6 rounded-full relative transition-colors", settings.openInNewTab ? "bg-cyan-600" : "bg-slate-700")}>
                    <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", settings.openInNewTab ? "left-7" : "left-1")}/>
                </button>
            </div>
        </div>
    </div>
  );
};
