
import React from 'react';
import { 
  LayoutGrid, Settings, Bot, Palette, Search, Terminal, 
  LogOut, Power, AppWindow, Workflow 
} from 'lucide-react';
import { cn } from '../../utils';
import { useI18n } from '../../hooks/useI18n';
import { Language } from '../../types';

type SidebarTab = 'dashboard' | 'widgets' | 'automation' | 'general' | 'ai' | 'appearance' | 'search' | 'diagnose';
type CloudSyncStatus = 'checking' | 'connected' | 'disconnected';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  cloudSyncStatus: CloudSyncStatus;
  onLogout: () => void;
  onExitEdit: () => void;
  language: Language; // Add language prop
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  cloudSyncStatus, 
  onLogout, 
  onExitEdit,
  language
}) => {
  const { t } = useI18n(language);

  const menuItems = [
    { id: 'dashboard', label: t('sidebar.dashboard'), icon: LayoutGrid },
    { id: 'widgets', label: t('sidebar.widgets'), icon: AppWindow },
    { id: 'automation', label: t('sidebar.automation'), icon: Workflow }, 
    { id: 'general', label: t('sidebar.general'), icon: Settings },
    { id: 'ai', label: t('sidebar.ai'), icon: Bot },
    { id: 'appearance', label: t('sidebar.appearance'), icon: Palette },
    { id: 'search', label: t('sidebar.search'), icon: Search },
    { id: 'diagnose', label: t('sidebar.diagnose'), icon: Terminal }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50 text-slate-100">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white">
          <Settings size={18}/>
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
          Admin
        </h1>
        <button 
          onClick={onExitEdit} 
          className="ml-auto p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" 
          aria-label={t('common.back')}
        >
          <Power size={20}/>
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id as SidebarTab)} 
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm", 
              activeTab === item.id 
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
          >
            <item.icon size={18}/> {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className={cn(
          "px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all",
          cloudSyncStatus === 'connected' ? "bg-teal-500/10 text-teal-300 border border-teal-500/20" :
          cloudSyncStatus === 'disconnected' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
          "bg-slate-800 text-slate-400 border border-slate-700"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            cloudSyncStatus === 'connected' ? "bg-teal-400" :
            cloudSyncStatus === 'disconnected' ? "bg-red-500" :
            "bg-slate-500"
          )}/>
          <span>
            {cloudSyncStatus === 'connected' ? t('sidebar.connected') :
             cloudSyncStatus === 'disconnected' ? t('sidebar.disconnected') :
             "Checking..."}
          </span>
        </div>
        <button 
          onClick={onLogout} 
          className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2 text-sm font-bold"
        >
          <LogOut size={16}/> {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  );
};
