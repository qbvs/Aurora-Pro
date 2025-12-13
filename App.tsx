
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Plus, Search, Moon, Sun, LayoutGrid, 
  LogOut, Edit, Trash2, X, Wand2, Globe, AlertCircle, 
  Image as ImageIcon, Upload, Palette, Type as TypeIcon, Lock,
  Activity, CircleCheck, CircleX, Terminal, Bot, Zap, RefreshCw, Key, Server, TriangleAlert, ChevronDown, ChevronRight,
  Flame, ChevronUp, ThumbsUp, ThumbsDown, Monitor, Cpu, Paintbrush, Radio, Link as LinkIcon, Power, Share2, Ellipsis, QrCode, OctagonAlert, Database, Cloud, Github, Mail
} from 'lucide-react';
import { 
  Category, LinkItem, AppSettings, SearchEngine, 
  LogEntry, AIProviderConfig, SocialLink 
} from './types';
import { addLog, subscribeLogs, getLogs, clearLogs } from './services/logger';
import { INITIAL_DATA, INITIAL_SETTINGS, INITIAL_SEARCH_ENGINES } from './constants';
import { 
  loadCategories, saveCategories, loadSettings, saveSettings, 
  loadSearchEngines, saveSearchEngines, isKVConfigured,
  syncCategoriesFromCloud, syncSettingsFromCloud, syncSearchEnginesFromCloud
} from './services/storageService';
import { analyzeUrl, generateCategoryLinks, getAiGreeting, suggestIcon, testAiConnection, fetchAiModels } from './services/geminiService';
import { Icon } from './components/Icon';
import { Favicon } from './components/Favicon';
import { Modal } from './components/Modal';
import { cn } from './utils';

// --- Constants ---
const COMMON_REC_ID = 'rec-1'; 

// --- Helper Functions ---
const isFaviconValid = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const hostname = new URL(url).hostname;
            if (!hostname) { resolve(false); return; }
            const img = new Image();
            img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            setTimeout(() => resolve(false), 3000); 
        } catch {
            resolve(false);
        }
    });
};

const LoadingSpinner = () => <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-600 rounded-full animate-spin" />;

// --- Main App Component ---

type SidebarTab = 'dashboard' | 'general' | 'ai' | 'appearance' | 'search' | 'diagnose';

export const App: React.FC = () => {
  // -- Data State --
  const [categories, setCategories] = useState<Category[]>(INITIAL_DATA);
  const [settings, setLocalSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(INITIAL_SEARCH_ENGINES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // -- UI State --
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // -- New UI State --
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [brokenLinks, setBrokenLinks] = useState<Set<string>>(new Set());

  // -- Inputs --
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // -- Dynamic Content --
  const [currentTime, setCurrentTime] = useState<string>('');
  const [aiGreeting, setAiGreeting] = useState<string>('');
  const [clock, setClock] = useState(new Date()); 

  // -- Modals & Editing --
  const [editingLink, setEditingLink] = useState<{ catId: string, link?: LinkItem } | null>(null);
  const [showGenLinksModal, setShowGenLinksModal] = useState<{catId: string, title: string} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  
  // Forms
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({});
  const [engineForm, setEngineForm] = useState<Partial<SearchEngine>>({});
  const [genCount, setGenCount] = useState(4);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Social Form
  const [socialForm, setSocialForm] = useState<Partial<SocialLink>>({});

  // AI Config Forms
  const [editingAiConfig, setEditingAiConfig] = useState<AIProviderConfig | null>(null);
  const [aiKeySource, setAiKeySource] = useState<'manual' | 'env'>('manual');
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'fail', message?: string }>({ status: 'idle' });
  
  // --- Initialization Logic ---
  const updateCommonRecommendations = (cats: Category[]): Category[] => {
      let allLinks: LinkItem[] = [];
      const seenUrls = new Set<string>();
      cats.forEach(cat => {
          if (cat.id === COMMON_REC_ID) return;
          cat.links.forEach(link => {
             const normalizedUrl = link.url.trim().replace(/\/$/, '');
             if (!seenUrls.has(normalizedUrl)) {
                 allLinks.push(link);
                 seenUrls.add(normalizedUrl);
             }
          });
      });
      allLinks.sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));
      const topLinks = allLinks.slice(0, 8);
      const newCommonCat: Category = {
          id: COMMON_REC_ID,
          title: '常用推荐',
          icon: 'Flame',
          links: topLinks.map(l => ({...l, id: `rec-${l.id}`}))
      };
      const commonCatIndex = cats.findIndex(c => c.id === COMMON_REC_ID);
      if (commonCatIndex >= 0) {
          const newCats = [...cats];
          newCats[commonCatIndex] = newCommonCat;
          return newCats;
      } else {
          return [newCommonCat, ...cats];
      }
  };

  useEffect(() => { const unsub = subscribeLogs(() => setLogs(getLogs())); setLogs(getLogs()); return unsub; }, []);
  useEffect(() => { if (localStorage.getItem('aurora_auth') === 'true') setIsAuthenticated(true); }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoadingData(true);
      try {
          const [localCats, localSets, localEngines] = await Promise.all([loadCategories(), loadSettings(), loadSearchEngines()]);
          if (localCats) setCategories(updateCommonRecommendations(localCats));
          else setCategories(updateCommonRecommendations(INITIAL_DATA));
          
          if (localSets) setLocalSettings({ ...INITIAL_SETTINGS, ...localSets, socialLinks: localSets.socialLinks || INITIAL_SETTINGS.socialLinks });
          if (localEngines) setSearchEngines(localEngines);
          addLog('info', '本地数据加载完成');
      } catch (e) { console.error(e); }
      setIsLoadingData(false);

      if (isKVConfigured()) {
          try {
              const [c, s, e] = await Promise.all([syncCategoriesFromCloud(), syncSettingsFromCloud(), syncSearchEnginesFromCloud()]);
              if (c) { setCategories(updateCommonRecommendations(c)); addLog('info', '云端同步成功'); }
              if (s) setLocalSettings(p => ({...p, ...s, socialLinks: s.socialLinks || p.socialLinks}));
              if (e) setSearchEngines(e);
          } catch (err) { console.error(err); }
      }
    };
    init();
    const h = new Date().getHours();
    setCurrentTime(h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好');
  }, []);

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);
  useEffect(() => { if (editingAiConfig) { setAiKeySource(editingAiConfig.envSlot ? 'env' : 'manual'); setTestStatus({ status: 'idle' }); } }, [editingAiConfig]);

  // AI Greeting
  useEffect(() => {
      if (!settings.enableAiGreeting) return;
      const cached = localStorage.getItem('aurora_greeting_v7'); 
      if (cached) {
          const { text, expiry } = JSON.parse(cached);
          if (Date.now() < expiry) { setAiGreeting(text); return; }
      }
      getAiGreeting().then(text => {
          if (text) {
              setAiGreeting(text);
              localStorage.setItem('aurora_greeting_v7', JSON.stringify({ text, expiry: Date.now() + 14400000 }));
          }
      });
  }, [settings.enableAiGreeting]);

  // --- Actions ---

  const handleSaveData = async (newCats: Category[]) => {
      const updated = updateCommonRecommendations(newCats);
      setCategories(updated);
      await saveCategories(updated);
  };
  
  const handleLinkClick = async (category: Category, link: LinkItem) => {
      window.open(link.url, settings.openInNewTab ? '_blank' : '_self');
      const newCats = categories.map(cat => {
          if (cat.id === COMMON_REC_ID) return cat;
          const hasLink = cat.links.some(l => l.url === link.url);
          return hasLink ? { ...cat, links: cat.links.map(l => l.url === link.url ? { ...l, clickCount: (l.clickCount || 0) + 1 } : l) } : cat;
      });
      handleSaveData(newCats);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!process.env.ADMIN_PASSWORD || passwordInput === process.env.ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('aurora_auth', 'true');
      setShowLoginModal(false);
      setIsEditMode(true);
      setLoginError('');
      setPasswordInput('');
      addLog('info', '管理员登录成功');
    } else {
      setLoginError('密码错误');
    }
  };

  const handleSaveLink = async () => {
    if (!editingLink || !linkForm.title || !linkForm.url) return;
    const isValid = await isFaviconValid(linkForm.url);
    if (!isValid && !confirm('该链接似乎无法加载图标，是否仍要添加？')) return;

    const newLink: LinkItem = {
      id: linkForm.id || `l-${Date.now()}`,
      title: linkForm.title,
      url: linkForm.url.startsWith('http') ? linkForm.url : `https://${linkForm.url}`,
      description: linkForm.description || '',
      color: linkForm.color || '#666',
      clickCount: linkForm.clickCount || 0,
      pros: linkForm.pros,
      cons: linkForm.cons
    };
    
    let newCats = categories.map(cat => {
      if (cat.id !== editingLink.catId) return cat;
      return editingLink.link ? { ...cat, links: cat.links.map(l => l.id === editingLink.link!.id ? newLink : l) } : { ...cat, links: [...cat.links, newLink] };
    });
    handleSaveData(newCats);
    setEditingLink(null);
    setLinkForm({});
    addLog('info', `链接已保存: ${newLink.title}`);
  };

  const handleGenerateCategoryLinks = async () => {
    if (!showGenLinksModal) return;
    setIsGeneratingLinks(true);
    try {
      const allExistingUrls = new Set<string>();
      categories.forEach(cat => cat.links.forEach(link => allExistingUrls.add(link.url.toLowerCase().replace(/\/$/, ""))));
      const existingInCat = categories.find(c => c.id === showGenLinksModal.catId)?.links.map(l => l.url) || [];
      const newLinks = await generateCategoryLinks(showGenLinksModal.title, genCount, existingInCat);
      
      const validLinks: LinkItem[] = [];
      for (const l of newLinks) {
          if (!l.url || !l.title) continue;
          const normalizedUrl = l.url.toLowerCase().replace(/\/$/, "");
          if (allExistingUrls.has(normalizedUrl)) continue;
          if (await isFaviconValid(l.url)) {
              validLinks.push({
                  id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  title: l.title,
                  url: l.url,
                  description: l.description || '',
                  color: l.color || '#666',
                  clickCount: 0,
                  pros: l.pros,
                  cons: l.cons
              });
              allExistingUrls.add(normalizedUrl);
          }
      }
      if (validLinks.length === 0) return alert("AI 生成未找到有效新链接");

      let newCats = categories.map(cat => cat.id !== showGenLinksModal.catId ? cat : { ...cat, links: [...cat.links, ...validLinks] });
      handleSaveData(newCats);
      setShowGenLinksModal(null);
      addLog('info', `AI 添加了 ${validLinks.length} 个链接`);
    } catch { 
        alert('生成失败'); 
    } finally { setIsGeneratingLinks(false); }
  };

  // --- Missing Handlers Implemented Below ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert('文件大小不能超过 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        const newSettings = { ...settings };
        if (type === 'logo') {
            newSettings.customLogoUrl = result;
            newSettings.logoMode = 'image';
        } else {
            newSettings.customBackgroundImage = result;
            newSettings.backgroundMode = 'custom';
        }
        setLocalSettings(newSettings);
        saveSettings(newSettings);
        addLog('info', `${type === 'logo' ? 'Logo' : '背景'} 图片已更新`);
    };
    reader.readAsDataURL(file);
  };

  const handleAddAiProvider = () => {
      const newConfig: AIProviderConfig = {
          id: `ai-${Date.now()}`,
          name: 'New Provider',
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          model: 'gpt-3.5-turbo',
          isActive: false
      };
      const newConfigs = [...settings.aiConfigs, newConfig];
      const newSettings = { ...settings, aiConfigs: newConfigs };
      setLocalSettings(newSettings);
      saveSettings(newSettings);
      setEditingAiConfig(newConfig);
  };

  const autoFillSearchEngine = (url: string) => {
      if (!url) return;
      try {
          // Add https if missing
          const fullUrl = url.startsWith('http') ? url : `https://${url}`;
          const urlObj = new URL(fullUrl);
          const hostname = urlObj.hostname.replace('www.', '');
          const name = hostname.split('.')[0];
          const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
          
          setEngineForm({
              ...engineForm,
              baseUrl: urlObj.origin,
              name: capitalized,
              searchUrlPattern: `${urlObj.origin}/search?q=` // Guess
          });
      } catch (e) {
          // ignore invalid url
      }
  };

  const toggleTheme = () => {
      const modes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
      const currentIndex = modes.indexOf(settings.theme);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      const newSettings = { ...settings, theme: nextMode };
      setLocalSettings(newSettings);
      saveSettings(newSettings);
  };

  const handleSettingsClick = () => {
      if (isAuthenticated) {
          setIsEditMode(true);
      } else {
          setShowLoginModal(true);
      }
  };

  const toggleCategoryExpand = (catId: string) => {
      const newSet = new Set(expandedCategories);
      if (newSet.has(catId)) {
          newSet.delete(catId);
      } else {
          newSet.add(catId);
      }
      setExpandedCategories(newSet);
  };

  const handleTestConnection = async (config: AIProviderConfig) => {
      setTestStatus({ status: 'loading' });
      const result = await testAiConnection(config);
      setTestStatus({ 
          status: result.success ? 'success' : 'fail', 
          message: result.message 
      });
  };

  const handleDeleteAiProvider = (id: string) => {
      if (!confirm('确定删除此 AI 配置吗？')) return;
      const newConfigs = settings.aiConfigs.filter(c => c.id !== id);
      const newSettings = { ...settings, aiConfigs: newConfigs };
      setLocalSettings(newSettings);
      saveSettings(newSettings);
      setEditingAiConfig(null);
  };

  const handleAiFillLink = async () => {
      if (!linkForm.url) return;
      setIsAiLoading(true);
      try {
          const result = await analyzeUrl(linkForm.url);
          setLinkForm(prev => ({
              ...prev,
              title: result.title,
              description: result.description,
              pros: result.pros,
              cons: result.cons,
              color: result.brandColor
          }));
          addLog('info', 'AI 链接分析完成');
      } catch (e: any) {
          alert('AI 分析失败: ' + e.message);
      } finally {
          setIsAiLoading(false);
      }
  };

  // --- Render Components ---

  const renderSidebar = () => (
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen fixed left-0 top-0 z-50">
          <div className="p-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white"><Settings size={18}/></div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">管理后台</h1>
              <div onClick={() => { setIsEditMode(false); }} className="ml-auto text-gray-400 hover:text-gray-600 cursor-pointer" title="退出编辑模式"><Power size={18}/></div>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
              {[
                  { id: 'dashboard', label: '仪表盘 / 链接', icon: LayoutGrid },
                  { id: 'general', label: '基础设置', icon: Settings },
                  { id: 'ai', label: 'AI 服务', icon: Bot },
                  { id: 'appearance', label: '外观效果', icon: Palette },
                  { id: 'search', label: '搜索引擎', icon: Search },
                  { id: 'diagnose', label: '系统日志', icon: Terminal },
              ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as SidebarTab)}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                        activeTab === item.id 
                            ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" 
                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-gray-400"
                    )}
                  >
                      <item.icon size={18}/>
                      {item.label}
                  </button>
              ))}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
              <div className={cn("px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2", isKVConfigured() ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                  <div className={cn("w-2 h-2 rounded-full", isKVConfigured() ? "bg-emerald-500" : "bg-red-500")}/>
                  {isKVConfigured() ? "已连接 Vercel KV" : "未连接数据库"}
              </div>
              <button onClick={() => { setIsAuthenticated(false); localStorage.removeItem('aurora_auth'); setIsEditMode(false); }} className="w-full flex items-center gap-2 text-red-500 hover:text-red-600 px-4 py-2 text-sm font-bold">
                  <LogOut size={16}/> 退出登录
              </button>
          </div>
      </aside>
  );

  const renderDashboardContent = () => (
      <div className="space-y-8 animate-fade-in">
          {categories.map((category, idx) => (
              <div key={category.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-violet-600 dark:text-violet-400"><Icon name={category.icon} size={20}/></div>
                          <input 
                            value={category.title}
                            onChange={(e) => { const n = [...categories]; n[idx].title = e.target.value; setCategories(n); }}
                            onBlur={() => handleSaveData(categories)}
                            className="text-lg font-bold bg-transparent outline-none border-b border-transparent focus:border-violet-500 w-40"
                          />
                      </div>
                      {category.id !== COMMON_REC_ID && (
                          <div className="flex items-center gap-2">
                              <button onClick={() => setShowGenLinksModal({catId: category.id, title: category.title})} className="flex items-center gap-1 px-3 py-1.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-lg text-xs font-bold hover:bg-violet-200"><Wand2 size={14}/> AI 填充</button>
                              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-2"/>
                              <button onClick={() => { const n = [...categories]; [n[idx], n[idx-1]] = [n[idx-1], n[idx]]; handleSaveData(n); }} disabled={idx <= 1} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronUp size={16}/></button>
                              <button onClick={() => { const n = [...categories]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; handleSaveData(n); }} disabled={idx === categories.length-1} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronDown size={16}/></button>
                              <button onClick={() => { if(confirm('确定删除此分类?')) { const n = categories.filter(c => c.id !== category.id); handleSaveData(n); }}} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                          </div>
                      )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {category.links.map(link => {
                          const isBroken = brokenLinks.has(link.id);
                          return (
                              <div key={link.id} className={cn("group relative p-4 rounded-xl border flex items-start gap-3 bg-white dark:bg-slate-900 hover:shadow-md transition-all", isBroken ? "border-red-200 bg-red-50" : "border-gray-100 dark:border-gray-700")}>
                                  <Favicon url={link.url} size={32} className="rounded-lg shadow-sm" onLoadError={() => setBrokenLinks(p => new Set(p).add(link.id))}/>
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-sm truncate">{link.title}</div>
                                      <div className="text-xs text-gray-400 truncate mt-0.5">{link.description}</div>
                                  </div>
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 p-1 rounded border shadow-sm">
                                      <button onClick={() => { setEditingLink({catId: category.id, link}); setLinkForm({...link}); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit size={12}/></button>
                                      <button onClick={() => { const n = categories.map(c => c.id===category.id?{...c, links: c.links.filter(l=>l.id!==link.id)}:c); handleSaveData(n); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={12}/></button>
                                  </div>
                              </div>
                          );
                      })}
                      {category.id !== COMMON_REC_ID && (
                          <button onClick={() => { setEditingLink({ catId: category.id }); setLinkForm({ color: '#666666' }); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all min-h-[80px]">
                              <Plus size={20}/>
                              <span className="text-xs font-bold">添加链接</span>
                          </button>
                      )}
                  </div>
              </div>
          ))}
          <button onClick={() => handleSaveData([...categories, { id: `cat-${Date.now()}`, title: '新分类', icon: 'Folder', links: [] }])} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-400 font-bold hover:border-violet-500 hover:text-violet-600 transition-all flex items-center justify-center gap-2">
              <Plus size={20}/> 添加新分类
          </button>
      </div>
  );

  const renderGeneralSettings = () => (
      <div className="space-y-6 max-w-3xl">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">
              <h2 className="text-lg font-bold">基础设置</h2>
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">站点名称</label>
                  <input value={settings.appName} onChange={e => { const s = {...settings, appName: e.target.value}; setLocalSettings(s); saveSettings(s); }} className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-slate-900 dark:border-gray-700"/>
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">个性化称呼 (用于欢迎语)</label>
                  <input value={settings.userName || ''} onChange={e => { const s = {...settings, userName: e.target.value}; setLocalSettings(s); saveSettings(s); }} placeholder="例如: 极客, 站长" className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-slate-900 dark:border-gray-700"/>
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">页脚内容 (支持 HTML)</label>
                  <input value={settings.footerHtml || ''} onChange={e => { const s = {...settings, footerHtml: e.target.value}; setLocalSettings(s); saveSettings(s); }} className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-slate-900 dark:border-gray-700 font-mono text-sm"/>
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">站点图标</label>
                  <div className="flex items-center gap-4">
                      <div className="flex rounded-lg border p-1 bg-gray-50 dark:bg-slate-900 dark:border-gray-700">
                          <button onClick={() => { const s = {...settings, logoMode: 'icon' as const}; setLocalSettings(s); saveSettings(s); }} className={cn("px-3 py-1.5 rounded text-sm font-bold", settings.logoMode === 'icon' ? "bg-white dark:bg-slate-700 shadow" : "text-gray-400")}>Lucide Icon</button>
                          <button onClick={() => { const s = {...settings, logoMode: 'image' as const}; setLocalSettings(s); saveSettings(s); }} className={cn("px-3 py-1.5 rounded text-sm font-bold", settings.logoMode === 'image' ? "bg-white dark:bg-slate-700 shadow" : "text-gray-400")}>自定义图片</button>
                      </div>
                      {settings.logoMode === 'icon' ? (
                          <div className="flex items-center gap-2 flex-1">
                              <div className="p-2 bg-violet-100 text-violet-600 rounded-lg"><Icon name={settings.appIcon} size={24}/></div>
                              <input value={settings.appIcon} onChange={e => { const s = {...settings, appIcon: e.target.value}; setLocalSettings(s); saveSettings(s); }} className="flex-1 p-2 rounded-lg border bg-gray-50 dark:bg-slate-900 dark:border-gray-700"/>
                          </div>
                      ) : (
                          <div className="flex items-center gap-2 flex-1">
                              <img src={settings.customLogoUrl} className="w-10 h-10 object-contain bg-gray-100 rounded-lg"/>
                              <input type="file" onChange={e => handleFileUpload(e, 'logo')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                          </div>
                      )}
                  </div>
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-2">社交媒体链接 (页脚显示)</label>
                  <div className="space-y-3">
                      {settings.socialLinks?.map((link, idx) => (
                          <div key={link.id} className="flex gap-2">
                              <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg shrink-0"><Icon name={link.icon} size={20}/></div>
                              <input value={link.platform} onChange={e => { const n = [...settings.socialLinks]; n[idx].platform = e.target.value; const s = {...settings, socialLinks: n}; setLocalSettings(s); saveSettings(s); }} className="w-24 p-2 rounded-lg border bg-gray-50 dark:bg-slate-900 dark:border-gray-700 text-sm" placeholder="名称"/>
                              <input value={link.url} onChange={e => { const n = [...settings.socialLinks]; n[idx].url = e.target.value; const s = {...settings, socialLinks: n}; setLocalSettings(s); saveSettings(s); }} className="flex-1 p-2 rounded-lg border bg-gray-50 dark:bg-slate-900 dark:border-gray-700 text-sm" placeholder="URL"/>
                              <button onClick={() => { const n = settings.socialLinks.filter((_, i) => i !== idx); const s = {...settings, socialLinks: n}; setLocalSettings(s); saveSettings(s); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                          </div>
                      ))}
                      <button onClick={() => { const n = [...settings.socialLinks, { id: `sl-${Date.now()}`, platform: 'New', url: '', icon: 'Link' }]; const s = {...settings, socialLinks: n}; setLocalSettings(s); saveSettings(s); }} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:text-violet-600 hover:border-violet-400 flex items-center justify-center gap-2"><Plus size={16}/> 添加社交链接</button>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderAISettings = () => (
      <div className="space-y-6 max-w-3xl">
          <h2 className="text-xl font-bold">AI 服务配置</h2>
          {settings.aiConfigs.map(config => (
              <div key={config.id} className={cn("p-6 rounded-2xl border transition-all flex items-center justify-between", config.isActive ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 border-transparent" : "bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700")}>
                  <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">{config.name} {config.isActive && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">当前使用</span>}</h3>
                      <p className={cn("text-sm mt-1 opacity-70", config.isActive ? "text-violet-100" : "text-gray-500")}>{config.type === 'google' ? 'Google Gemini SDK' : 'OpenAI Compatible'} • {config.model}</p>
                  </div>
                  <div className="flex items-center gap-3">
                      <button onClick={() => setEditingAiConfig(config)} className={cn("p-2 rounded-lg transition-colors", config.isActive ? "bg-white/10 hover:bg-white/20" : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500")}><Settings size={20}/></button>
                      <button 
                        onClick={() => { const n = settings.aiConfigs.map(c => ({...c, isActive: c.id === config.id})); const s = {...settings, aiConfigs: n}; setLocalSettings(s); saveSettings(s); }} 
                        className={cn("px-4 py-2 rounded-lg font-bold text-sm", config.isActive ? "bg-white text-violet-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                      >
                          {config.isActive ? '已启用' : '启用'}
                      </button>
                  </div>
              </div>
          ))}
          <button onClick={handleAddAiProvider} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-400 font-bold hover:border-violet-500 hover:text-violet-600 flex items-center justify-center gap-2"><Plus size={20}/> 添加新服务</button>
      </div>
  );

  const renderAppearance = () => (
      <div className="max-w-3xl bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-8">
          <div>
              <label className="block text-sm font-bold text-gray-500 mb-4">背景模式</label>
              <div className="grid grid-cols-3 gap-4">
                  {[
                      { id: 'aurora', label: '极光' },
                      { id: 'monotone', label: '纯色' },
                      { id: 'custom', label: '自定义' }
                  ].map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => { const s = {...settings, backgroundMode: opt.id as any}; setLocalSettings(s); saveSettings(s); }}
                        className={cn("py-3 rounded-xl border-2 font-bold transition-all", settings.backgroundMode === opt.id ? "border-violet-500 text-violet-600 bg-violet-50 dark:bg-violet-900/20" : "border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-300")}
                      >
                          {opt.label}
                      </button>
                  ))}
              </div>
          </div>
          
          <div className="space-y-6">
              {[
                  { label: '背景模糊度', key: 'backgroundBlur', min: 0, max: 20, suffix: 'px' },
                  { label: '背景遮罩浓度', key: 'backgroundMaskOpacity', min: 0, max: 90, suffix: '%' },
                  { label: '卡片透明度', key: 'cardOpacity', min: 20, max: 100, suffix: '%' },
              ].map(item => (
                  <div key={item.key}>
                      <div className="flex justify-between text-sm font-bold mb-2">
                          <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                          <span className="text-gray-400">{(settings as any)[item.key]}{item.suffix}</span>
                      </div>
                      <input 
                        type="range" 
                        min={item.min} max={item.max} 
                        value={(settings as any)[item.key]} 
                        onChange={e => { const s = {...settings, [item.key]: Number(e.target.value)}; setLocalSettings(s); saveSettings(s); }}
                        className="w-full accent-violet-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>
              ))}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700">
              <div>
                  <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Bot size={18}/> AI 欢迎语</div>
                  <div className="text-xs text-gray-400 mt-1">每天生成一句新问候</div>
              </div>
              <button 
                onClick={() => { const s = {...settings, enableAiGreeting: !settings.enableAiGreeting}; setLocalSettings(s); saveSettings(s); }}
                className={cn("w-12 h-7 rounded-full transition-colors relative", settings.enableAiGreeting ? "bg-violet-600" : "bg-gray-200")}
              >
                  <div className={cn("w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm", settings.enableAiGreeting ? "left-6" : "left-1")}/>
              </button>
          </div>
      </div>
  );

  const renderSearchSettings = () => (
      <div className="max-w-3xl space-y-6">
          <h2 className="text-xl font-bold">搜索引擎</h2>
          <div className="space-y-4">
              {searchEngines.map(se => (
                  <div key={se.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <Favicon url={se.baseUrl} size={32} className="rounded-lg"/>
                      <div className="flex-1">
                          <div className="font-bold">{se.name}</div>
                          <div className="text-xs text-gray-400 truncate">{se.searchUrlPattern}</div>
                      </div>
                      <button onClick={() => { const n = searchEngines.filter(s => s.id !== se.id); setSearchEngines(n); saveSearchEngines(n); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                  </div>
              ))}
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
              <h3 className="font-bold text-sm text-gray-500">添加新引擎</h3>
              <div className="flex gap-2">
                  <input value={engineForm.baseUrl || ''} onChange={e => setEngineForm({...engineForm, baseUrl: e.target.value})} placeholder="URL (e.g. baidu.com)" className="flex-1 p-3 rounded-lg border bg-gray-50 dark:bg-slate-900 dark:border-gray-700 text-sm"/>
                  <button onClick={() => autoFillSearchEngine(engineForm.baseUrl || '')} className="px-4 bg-violet-100 text-violet-600 rounded-lg text-xs font-bold hover:bg-violet-200"><Zap size={14}/> 智能识别</button>
                  <input value={engineForm.name || ''} onChange={e => setEngineForm({...engineForm, name: e.target.value})} placeholder="名称" className="w-24 p-3 rounded-lg border bg-gray-50 dark:bg-slate-900 dark:border-gray-700 text-sm"/>
              </div>
              <input value={engineForm.searchUrlPattern || ''} onChange={e => setEngineForm({...engineForm, searchUrlPattern: e.target.value})} placeholder="搜索 URL Pattern (e.g. https://.../s?q=)" className="w-full p-3 rounded-lg border bg-gray-50 dark:bg-slate-900 dark:border-gray-700 text-sm font-mono"/>
              <button 
                  onClick={() => { if(engineForm.name && engineForm.searchUrlPattern) { const n = [...searchEngines, { ...engineForm, id: `se-${Date.now()}` } as SearchEngine]; setSearchEngines(n); saveSearchEngines(n); setEngineForm({}); }}} 
                  className="w-full py-3 bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-700"
              >
                  添加
              </button>
          </div>
      </div>
  );

  const renderLogs = () => (
      <div className="max-w-4xl space-y-6">
          <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold">系统诊断</h2>
              <button onClick={clearLogs} className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-xs font-bold rounded hover:bg-gray-300">清空日志</button>
          </div>
          <div className="bg-black rounded-xl p-6 font-mono text-xs h-[400px] overflow-y-auto custom-scrollbar shadow-2xl border border-gray-800 text-green-400">
              <div className="text-gray-500 mb-2 border-b border-gray-800 pb-2">SYSTEM LOGS</div>
              {logs.map(log => (
                  <div key={log.id} className="mb-1.5 flex gap-3">
                      <span className="opacity-50 text-gray-400">[{log.time}]</span>
                      <span className={cn("font-bold uppercase w-12", log.level === 'error' ? "text-red-500" : log.level === 'warn' ? "text-yellow-500" : "text-blue-400")}>{log.level}</span>
                      <span className="text-gray-300">{log.message}</span>
                  </div>
              ))}
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-sm text-gray-500 mb-4">诊断环境变量检查</h3>
              <div className="grid grid-cols-2 gap-4">
                  {[
                      { k: 'API_KEY', v: process.env.API_KEY },
                      { k: 'KV_REST_API_URL', v: process.env.KV_REST_API_URL },
                      { k: 'ADMIN_PASSWORD', v: process.env.ADMIN_PASSWORD },
                  ].map(c => (
                      <div key={c.k} className="flex justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg text-xs">
                          <span className="font-mono font-bold">{c.k}</span>
                          {c.v ? <span className="text-emerald-500 flex items-center gap-1"><CircleCheck size={12}/> 已配置</span> : <span className="text-red-500 flex items-center gap-1"><CircleX size={12}/> 未配置</span>}
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  // --- View Mode Render ---
  if (!isEditMode) {
      return (
        <div className="min-h-screen text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300 relative overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 z-0">
                {settings.backgroundMode === 'custom' && settings.customBackgroundImage ? (
                    <img src={settings.customBackgroundImage} className="w-full h-full object-cover"/>
                ) : settings.backgroundMode === 'aurora' ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-slate-900 dark:via-purple-900/20 dark:to-slate-900 animate-gradient"/>
                ) : (
                    <div className="absolute inset-0 bg-gray-50 dark:bg-slate-950"/>
                )}
                <div className="absolute inset-0 backdrop-blur-[var(--blur)] bg-black/[var(--mask)] transition-all" style={{ '--blur': `${settings.backgroundBlur}px`, '--mask': `${settings.backgroundMaskOpacity / 100}` } as any} />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <header className="flex items-center justify-between py-6">
                    <div className="flex items-center gap-3">
                        {settings.logoMode === 'icon' ? (
                            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/30"><Icon name={settings.appIcon} size={24}/></div>
                        ) : (
                            <img src={settings.customLogoUrl} className="w-10 h-10 rounded-xl object-contain bg-white/80 backdrop-blur shadow-sm" />
                        )}
                        <h1 className="text-2xl font-bold tracking-tight">{settings.appName}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-sm">
                            {settings.theme === 'dark' ? <Moon size={20} className="text-indigo-400"/> : <Sun size={20} className="text-amber-500"/>}
                        </button>
                        <button onClick={handleSettingsClick} className="w-10 h-10 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-sm group">
                            <Settings size={20} className="group-hover:rotate-90 transition-transform"/>
                        </button>
                    </div>
                </header>

                <div className="flex flex-col items-center py-12 mb-8 animate-fade-in-up">
                    <div className="text-center mb-10 select-none">
                        <h1 className="text-7xl font-bold tracking-tighter tabular-nums mb-4 drop-shadow-sm bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                            {clock.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', second: '2-digit'})}
                        </h1>
                        <div className="text-sm font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">{clock.toLocaleDateString('zh-CN', {month:'long', day:'numeric', weekday:'long'})}</div>
                        <p className="text-2xl md:text-3xl font-bold tracking-tight opacity-90">
                            <span className="font-normal mr-2 opacity-70">{currentTime}，</span>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">{aiGreeting || "精诚所至，金石为开。"}</span>
                        </p>
                    </div>
                    
                    <div className="w-full max-w-2xl relative group mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400/30 to-fuchsia-400/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                        <form onSubmit={(e) => { e.preventDefault(); if(searchTerm) window.open(searchEngines.find(s=>s.id===settings.activeSearchEngineId)?.searchUrlPattern + encodeURIComponent(searchTerm), '_blank'); }} className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-2 flex items-center transition-all group-focus-within:ring-2 ring-violet-500/50 transform group-hover:scale-[1.01]">
                            <div className="pl-4 pr-3 border-r border-gray-200 dark:border-gray-700 mr-2 opacity-70"><Favicon url={searchEngines.find(s=>s.id===settings.activeSearchEngineId)?.baseUrl || ''} size={24}/></div>
                            <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={`在 ${searchEngines.find(s=>s.id===settings.activeSearchEngineId)?.name} 上搜索...`} className="flex-1 bg-transparent outline-none text-lg h-12 text-gray-800 dark:text-white placeholder-gray-400"/>
                            <button type="submit" className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-transform hover:scale-105 shadow-md"><Search/></button>
                        </form>
                    </div>

                    <div className="flex gap-4">
                        {searchEngines.map(se => (
                            <button 
                              key={se.id} 
                              onClick={() => { setLocalSettings(p=>({...p, activeSearchEngineId: se.id})); saveSettings({...settings, activeSearchEngineId: se.id}); }}
                              className={cn("px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all", settings.activeSearchEngineId === se.id ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-1 ring-violet-500/50" : "bg-white/50 dark:bg-black/20 text-gray-500 hover:bg-white dark:hover:bg-slate-800")}
                            >
                                <Favicon url={se.baseUrl} size={14} className="rounded-sm"/> {se.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                {categories.map((category) => {
                    const isCommonRecs = category.id === COMMON_REC_ID;
                    const isExpanded = expandedCategories.has(category.id);
                    const limit = isCommonRecs ? 8 : 4;
                    const visibleLinks = isExpanded || isCommonRecs ? category.links : category.links.slice(0, limit);

                    return (
                    <div key={category.id} className="transition-all duration-300">
                        <div className="flex items-center gap-3 mb-6 px-1">
                            <div className="p-2 rounded-xl text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/10">
                                <Icon name={category.icon} size={24} />
                            </div>
                            <h2 className="font-bold text-xl">{category.title}</h2>
                            {!isCommonRecs && category.links.length > 4 && (
                                <button onClick={() => toggleCategoryExpand(category.id)} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                                    {isExpanded ? <ChevronUp size={16} /> : <Ellipsis size={16} />}
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {visibleLinks.map((link) => (
                                <div 
                                    key={link.id} 
                                    onClick={() => handleLinkClick(category, link)} 
                                    className="group relative flex flex-col p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-transparent hover:border-violet-200 dark:hover:border-violet-500/30 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full"
                                    style={{ backgroundColor: `rgba(var(--bg), ${settings.cardOpacity / 100})` }}
                                >
                                    <div className="flex items-start gap-4 mb-3">
                                        <Favicon url={link.url} size={40} className="shadow-md rounded-xl" />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate text-[15px]">{link.title}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-5 h-10 line-clamp-2 overflow-hidden">{link.description}</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                                        {link.pros && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-medium border border-emerald-100 dark:border-emerald-500/20 max-w-full truncate"><CircleCheck size={10} className="shrink-0"/> {link.pros}</span>}
                                        {link.cons && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 text-[10px] font-medium border border-rose-100 dark:border-rose-500/20 max-w-full truncate"><CircleX size={10} className="shrink-0"/> {link.cons}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {!isCommonRecs && category.links.length > 4 && (
                            <div className="mt-4 flex justify-center">
                                <button onClick={() => toggleCategoryExpand(category.id)} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                                    {isExpanded ? <>收起 <ChevronUp size={14}/></> : <>查看更多 ({category.links.length - 4}) <ChevronDown size={14}/></>}
                                </button>
                            </div>
                        )}
                    </div>
                    );
                })}
                </div>

                <footer className="py-10 text-center border-t border-gray-100 dark:border-white/5 mt-20 space-y-6">
                    <div className="flex justify-center gap-4">
                        {settings.socialLinks?.map(link => (
                            <a 
                            key={link.id}
                            href={link.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-violet-600 hover:text-white transition-all shadow-sm"
                            title={link.platform}
                            >
                                <Icon name={link.icon} size={20}/>
                            </a>
                        ))}
                    </div>
                    <div className="text-sm text-gray-400 dark:text-gray-500 font-medium" dangerouslySetInnerHTML={{ __html: settings.footerHtml || '' }}></div>
                </footer>
            </div>
            
            {showLoginModal && (
                <Modal title="管理员登录" onClose={() => setShowLoginModal(false)} icon={<Lock size={20}/>}>
                     <form onSubmit={handleLogin} className="p-6 space-y-4">
                         <p className="text-gray-500 text-sm">请输入管理员密码以进入编辑模式。</p>
                         <input 
                            type="password" 
                            value={passwordInput} 
                            onChange={e => setPasswordInput(e.target.value)} 
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none"
                            placeholder="Password"
                            autoFocus
                         />
                         {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
                         <button type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700">登录</button>
                     </form>
                </Modal>
            )}
        </div>
      );
  }

  // --- Admin Mode Render ---
  return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-gray-200 font-sans flex">
          {renderSidebar()}
          <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
              <div className="max-w-6xl mx-auto">
                  {activeTab === 'dashboard' && renderDashboardContent()}
                  {activeTab === 'general' && renderGeneralSettings()}
                  {activeTab === 'ai' && renderAISettings()}
                  {activeTab === 'appearance' && renderAppearance()}
                  {activeTab === 'search' && renderSearchSettings()}
                  {activeTab === 'diagnose' && renderLogs()}
              </div>
          </main>

          {/* All Modals */}
          {editingAiConfig && (
            <Modal title="编辑 AI 服务" onClose={() => { setEditingAiConfig(null); setTestStatus({ status: 'idle' }); }} icon={<Bot size={20}/>}>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-gray-500">名称</label>
                            <input value={editingAiConfig.name} onChange={e=>setEditingAiConfig({...editingAiConfig, name:e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none"/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-gray-500">类型</label>
                            <select value={editingAiConfig.type} onChange={e=>setEditingAiConfig({...editingAiConfig, type:e.target.value as any})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none">
                                <option value="google">Google Gemini SDK</option>
                                <option value="openai">OpenAI Compatible</option>
                            </select>
                        </div>
                    </div>
                    {editingAiConfig.type === 'openai' && (
                        <div>
                            <label className="block text-sm font-bold mb-2 text-gray-500">API Endpoint</label>
                            <input value={editingAiConfig.baseUrl} onChange={e=>setEditingAiConfig({...editingAiConfig, baseUrl:e.target.value})} placeholder="https://api.openai.com/v1" className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none font-mono text-sm"/>
                        </div>
                    )}
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-500">API 密钥来源</label>
                            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                <button onClick={() => setAiKeySource('manual')} className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", aiKeySource === 'manual' ? "bg-white dark:bg-slate-700 shadow-sm text-violet-600" : "text-gray-400 hover:text-gray-600")}>手动输入</button>
                                <button onClick={() => setAiKeySource('env')} className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", aiKeySource === 'env' ? "bg-white dark:bg-slate-700 shadow-sm text-violet-600" : "text-gray-400 hover:text-gray-600")}>环境变量</button>
                            </div>
                        </div>
                        
                        {aiKeySource === 'env' ? (
                            <div className="relative group">
                                <select 
                                    value={editingAiConfig.envSlot || 'CUSTOM_API_KEY_1'} 
                                    onChange={e => setEditingAiConfig({...editingAiConfig, envSlot: e.target.value, apiKey: ''})}
                                    className="w-full p-3 pl-4 pr-10 rounded-xl border-2 border-violet-100 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-900/10 text-violet-700 dark:text-violet-300 outline-none appearance-none font-mono text-sm font-bold cursor-pointer transition-all hover:border-violet-300"
                                >
                                    {[1,2,3,4,5].map(i => (
                                        <option key={i} value={`CUSTOM_API_KEY_${i}`}>CUSTOM_API_KEY_{i}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-3.5 text-violet-500 pointer-events-none group-hover:translate-y-0.5 transition-transform"><ChevronDown size={16}/></div>
                            </div>
                        ) : (
                            editingAiConfig.type === 'google' ? (
                                <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-gray-500 text-sm italic flex items-center gap-2">
                                    <Key size={14}/> 使用默认 process.env.API_KEY
                                </div>
                            ) : (
                                <input type="password" value={editingAiConfig.apiKey} onChange={e=>setEditingAiConfig({...editingAiConfig, apiKey:e.target.value, envSlot: undefined})} placeholder="sk-..." className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none font-mono text-sm"/>
                            )
                        )}
                        {aiKeySource === 'env' && <p className="text-xs text-gray-400 mt-2 ml-1">请确保在 Vercel 环境变量中已配置对应的 Key。</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-gray-500">模型名称</label>
                        <input value={editingAiConfig.model} onChange={e=>setEditingAiConfig({...editingAiConfig, model:e.target.value})} placeholder="gpt-4o / gemini-2.5-flash" className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none font-mono text-sm"/>
                    </div>
                    <div className="flex gap-2 pt-4">
                        <button onClick={() => handleTestConnection(editingAiConfig)} disabled={testStatus.status === 'loading'} className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border shadow-sm", testStatus.status === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-600" : testStatus.status === 'fail' ? "bg-red-50 border-red-200 text-red-600" : "bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50")}>
                            {testStatus.status === 'loading' ? <LoadingSpinner/> : testStatus.status === 'success' ? <CircleCheck size={16}/> : testStatus.status === 'fail' ? <TriangleAlert size={16}/> : <Activity size={16}/>}
                            {testStatus.status === 'loading' ? '测试中' : '检测'}
                        </button>
                        <button onClick={async () => {
                             let newConfigs = settings.aiConfigs.map(c => c.id === editingAiConfig.id ? editingAiConfig : c);
                             if (editingAiConfig.id.startsWith('ai-') && !settings.aiConfigs.find(c => c.id === editingAiConfig.id)) {
                                 newConfigs = [...settings.aiConfigs.filter(c => c.id !== editingAiConfig.id), editingAiConfig];
                             }
                             const newSettings = { ...settings, aiConfigs: newConfigs };
                             setLocalSettings(newSettings);
                             await saveSettings(newSettings);
                             setEditingAiConfig(null);
                        }} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 shadow-lg shadow-violet-500/30">保存配置</button>
                    </div>
                    {testStatus.message && <div className={cn("text-xs text-center font-medium mt-1", testStatus.status === 'success' ? "text-emerald-500" : testStatus.status === 'fail' ? "text-red-500" : "text-gray-400")}>{testStatus.message}</div>}
                    
                    <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                        <button onClick={() => handleDeleteAiProvider(editingAiConfig.id)} className="text-red-400 hover:text-red-600 text-xs font-bold flex items-center gap-1 transition-colors"><Trash2 size={12}/> 删除此配置</button>
                    </div>
                </div>
            </Modal>
      )}

      {showGenLinksModal && (
            <Modal title={`AI 生成推荐: ${showGenLinksModal.title}`} onClose={() => setShowGenLinksModal(null)} icon={<Wand2 size={20}/>}>
                <div className="p-6 space-y-6">
                    <div className="p-4 bg-violet-50 dark:bg-violet-900/10 rounded-xl text-violet-800 dark:text-violet-200 text-sm leading-relaxed">
                        AI 将分析该分类，并推荐 <span className="font-bold">{genCount}</span> 个最相关的优质网站。
                        <br/><span className="text-xs opacity-70 mt-1 block">注意：系统将自动验证网站有效性并过滤重复项，实际生成数量可能少于预期。</span>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">生成数量: {genCount}</label>
                        <input type="range" min="1" max="8" value={genCount} onChange={e=>setGenCount(Number(e.target.value))} className="w-full accent-violet-600"/>
                    </div>
                    <button onClick={handleGenerateCategoryLinks} disabled={isGeneratingLinks} className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2">
                        {isGeneratingLinks ? <><LoadingSpinner/> 正在思考...</> : '开始生成'}
                    </button>
                </div>
            </Modal>
      )}
      
      {editingLink && (
            <Modal title={editingLink.link ? '编辑链接' : '添加链接'} onClose={() => { setEditingLink(null); setLinkForm({}); }} icon={<LinkIcon size={20}/>}>
                <div className="p-6 space-y-4">
                    <div className="flex gap-2">
                         <input value={linkForm.url||''} onChange={e=>setLinkForm({...linkForm, url:e.target.value})} placeholder="URL (https://...)" className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none"/>
                         <button onClick={handleAiFillLink} disabled={isAiLoading} className="px-4 bg-violet-100 text-violet-600 rounded-xl font-bold hover:bg-violet-200 transition-colors flex items-center gap-2">{isAiLoading?<LoadingSpinner/>:<Wand2 size={16}/>} 智能识别</button>
                    </div>
                    <input value={linkForm.title||''} onChange={e=>setLinkForm({...linkForm, title:e.target.value})} placeholder="标题" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none font-bold text-lg"/>
                    <textarea value={linkForm.description||''} onChange={e=>setLinkForm({...linkForm, description:e.target.value})} placeholder="描述" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none h-24 resize-none"/>
                    <div className="grid grid-cols-2 gap-4">
                        <input value={linkForm.pros||''} onChange={e=>setLinkForm({...linkForm, pros:e.target.value})} placeholder="优点 (e.g. 免费)" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none text-sm"/>
                        <input value={linkForm.cons||''} onChange={e=>setLinkForm({...linkForm, cons:e.target.value})} placeholder="缺点 (e.g. 需注册)" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none text-sm"/>
                    </div>
                    <button onClick={handleSaveLink} className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/30">保存</button>
                </div>
            </Modal>
        )}
        
        {confirmModal && (
            <Modal title="确认操作" onClose={() => setConfirmModal(null)} icon={<AlertCircle size={20}/>}>
                <div className="p-6 text-center space-y-6">
                    <p className="text-lg text-gray-700 dark:text-gray-300">{confirmModal.message}</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setConfirmModal(null)} className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 font-bold text-gray-500 hover:bg-gray-200">取消</button>
                        <button onClick={confirmModal.onConfirm} className="px-6 py-2 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/30">确认</button>
                    </div>
                </div>
            </Modal>
        )}
      </div>
  );
};
