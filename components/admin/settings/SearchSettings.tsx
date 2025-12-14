
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { AppSettings, SearchEngine } from '../../../types';
import { Favicon } from '../../Favicon';
import { Modal } from '../../Modal';
import { cn } from '../../../utils';

interface SearchSettingsProps {
  settings: AppSettings;
  searchEngines: SearchEngine[];
  onUpdateSettings: (s: AppSettings) => void;
  onUpdateEngines: (e: SearchEngine[]) => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const SearchSettings: React.FC<SearchSettingsProps> = ({ 
  settings, 
  searchEngines, 
  onUpdateSettings, 
  onUpdateEngines,
  addToast
}) => {
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [engineForm, setEngineForm] = useState<Partial<SearchEngine>>({});

  const autoFillSearchEngine = (url: string) => { 
      if (!url) return; 
      try { 
          const fullUrl = url.startsWith('http') ? url : `https://${url}`; const urlObj = new URL(fullUrl); const hostname = urlObj.hostname.toLowerCase().replace('www.', ''); let name = ''; let searchUrlPattern = '';
          if (hostname.includes('google')) { name = 'Google'; searchUrlPattern = 'https://www.google.com/search?q='; }
          else if (hostname.includes('baidu')) { name = '百度'; searchUrlPattern = 'https://www.baidu.com/s?wd='; }
          else if (hostname.includes('bing')) { name = 'Bing'; searchUrlPattern = 'https://www.bing.com/search?q='; }
          else { const parts = hostname.split('.'); name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1); searchUrlPattern = `${urlObj.origin}/search?q=`; }
          setEngineForm({ ...engineForm, baseUrl: urlObj.origin, name: engineForm.name || name, searchUrlPattern: engineForm.searchUrlPattern || searchUrlPattern }); 
          addToast('info', `智能识别搜索引擎: ${name}`);
      } catch (e) { } 
  };

  const handleSaveEngine = () => {
      if (!engineForm.name || !engineForm.baseUrl || !engineForm.searchUrlPattern) { addToast('error', '请填写完整信息'); return; }
      const newEngine: SearchEngine = {
          id: engineForm.id || `se-${Date.now()}`,
          name: engineForm.name,
          baseUrl: engineForm.baseUrl,
          searchUrlPattern: engineForm.searchUrlPattern
      };
      const newEngines = engineForm.id 
          ? searchEngines.map(e => e.id === engineForm.id ? newEngine : e)
          : [...searchEngines, newEngine];
      onUpdateEngines(newEngines);
      setShowEngineModal(false);
      addToast('success', '搜索引擎已保存');
  };

  const handleDeleteEngine = (engineId: string) => {
      if (searchEngines.length <= 1) { addToast('error', '至少保留一个搜索引擎'); return; }
      const newEngines = searchEngines.filter(e => e.id !== engineId);
      onUpdateEngines(newEngines);
      if (settings.activeSearchEngineId === engineId) {
          onUpdateSettings({...settings, activeSearchEngineId: newEngines[0].id});
      }
  };

  return (
      <div className="space-y-6 animate-fade-in text-slate-200">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">搜索引擎</h2>
              <button onClick={() => { setEngineForm({}); setShowEngineModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 active:scale-95">
                  <Plus size={18}/> 添加引擎
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchEngines.map(engine => (
                  <div key={engine.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-4 hover:border-cyan-500/30 transition-all group">
                      <Favicon url={engine.baseUrl} size={32} className="rounded-lg"/>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white">{engine.name}</h3>
                          <p className="text-xs text-slate-500 truncate font-mono">{engine.searchUrlPattern}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEngineForm(engine); setShowEngineModal(true); }} className="p-2 hover:bg-slate-800 rounded-lg text-cyan-400"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteEngine(engine.id)} className="p-2 hover:bg-slate-800 rounded-lg text-red-400"><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))}
          </div>
          
          {showEngineModal && (
              <Modal title={engineForm.id ? '编辑搜索引擎' : '添加搜索引擎'} onClose={() => setShowEngineModal(false)} icon={<Search className="text-cyan-400"/>}>
                  <div className="p-6 space-y-4 text-slate-200">
                      <div>
                           <label className="block text-sm font-bold text-slate-400 mb-2">主页网址 (用于图标)</label>
                           <div className="flex gap-2">
                               <input value={engineForm.baseUrl || ''} onChange={(e) => setEngineForm({...engineForm, baseUrl: e.target.value})} onBlur={() => autoFillSearchEngine(engineForm.baseUrl || '')} className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500" placeholder="https://www.google.com"/>
                           </div>
                      </div>
                      <div>
                           <label className="block text-sm font-bold text-slate-400 mb-2">引擎名称</label>
                           <input value={engineForm.name || ''} onChange={(e) => setEngineForm({...engineForm, name: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
                      </div>
                      <div>
                           <label className="block text-sm font-bold text-slate-400 mb-2">搜索 URL 模式</label>
                           <input value={engineForm.searchUrlPattern || ''} onChange={(e) => setEngineForm({...engineForm, searchUrlPattern: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 font-mono text-sm" placeholder="https://www.google.com/search?q="/>
                           <p className="text-xs text-slate-500 mt-2">提示: 请确保 URL 以查询参数结尾 (例如 ?q=)</p>
                      </div>
                      <button onClick={handleSaveEngine} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl mt-2">保存</button>
                  </div>
              </Modal>
          )}
      </div>
  );
};
