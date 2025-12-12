import React, { useState, useEffect } from 'react';
import { 
  Settings, Plus, Search, Moon, Sun, LayoutGrid, 
  LogOut, Edit3, Trash2, X, Wand2, Globe, AlertCircle, 
  Image as ImageIcon, Upload, Palette, Type as TypeIcon, Lock,
  Activity, CheckCircle2, XCircle, Terminal, Bot, Zap, RefreshCw, Key, Server, AlertTriangle, ChevronDown, ChevronRight
} from 'lucide-react';
import { 
  Category, LinkItem, AppSettings, SearchEngine, 
  addLog, subscribeLogs, getLogs, clearLogs, LogEntry, AIProviderConfig 
} from './types';
import { INITIAL_DATA, INITIAL_SETTINGS, INITIAL_SEARCH_ENGINES } from './constants';
import { 
  loadCategories, saveCategories, loadSettings, saveSettings, 
  loadSearchEngines, saveSearchEngines, isKVConfigured,
  syncCategoriesFromCloud, syncSettingsFromCloud, syncSearchEnginesFromCloud
} from './services/storageService';
import { analyzeUrl, generateCategoryLinks, getAiGreeting, suggestIcon, testAiConnection, fetchAiModels } from './services/geminiService';
import { Icon } from './components/Icon';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Helper Components ---

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/20 dark:border-white/5 overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
          <Settings size={20} />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
          <X size={20} className="text-gray-500" />
        </button>
      </div>
      <div className="p-0 overflow-y-auto flex-1">
        {children}
      </div>
    </div>
  </div>
);

const Favicon = ({ url, size = 32, className }: { url: string, size?: number, className?: string }) => {
  try {
    return (
      <img 
        src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${url}&sz=${size * 2}`}
        alt="icon" 
        className={cn("bg-white rounded-full", className)}
        style={{ width: size, height: size }}
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/32/32'; }}
      />
    );
  } catch {
    return <div style={{ width: size, height: size }} className={cn("bg-gray-200 rounded-full", className)} />;
  }
};

const QUOTA_EXCEEDED_MESSAGE = 'AI 免费额度已用尽或 API 连接失败。\n\n请在「全局设置 -> AI 模型」中切换服务商，或检查您的 API Key 和网络连接。';

// --- Main App Component ---

const App: React.FC = () => {
  // -- State --
  const [categories, setCategories] = useState<Category[]>(INITIAL_DATA);
  const [settings, setLocalSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(INITIAL_SEARCH_ENGINES);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [aiGreeting, setAiGreeting] = useState<string>('');
  const [clock, setClock] = useState(new Date()); 
  
  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingLink, setEditingLink] = useState<{ catId: string, link?: LinkItem } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);

  // Link Editor State
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({});
  
  // Search Engine Editor State
  const [engineForm, setEngineForm] = useState<Partial<SearchEngine>>({});
  const [isAddingEngine, setIsAddingEngine] = useState(false);

  // Settings Tab State
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'ai' | 'appearance' | 'search' | 'diagnose'>('general');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);

  // AI Configuration State (for editing)
  const [editingAiConfig, setEditingAiConfig] = useState<AIProviderConfig | null>(null);
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'fail', message?: string }>({ status: 'idle' });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // AI Generation State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showGenLinksModal, setShowGenLinksModal] = useState<{catId: string, title: string} | null>(null);
  const [genCount, setGenCount] = useState(4);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);

  // -- Effects --

  // Logger Subscription
  useEffect(() => {
    const unsub = subscribeLogs(() => {
        setLogs(getLogs());
    });
    // Init logs
    setLogs(getLogs());
    return unsub;
  }, []);

  // Load Data
  useEffect(() => {
    const initData = async () => {
      addLog('info', "App Initializing...");
      setIsLoadingData(true);
      
      // 1. Load Local Data First (Instant)
      const localCats = await loadCategories();
      const localSets = await loadSettings();
      const localEngines = await loadSearchEngines();

      if (localCats) setCategories(localCats);
      if (localSets) setLocalSettings(localSets);
      if (localEngines) setSearchEngines(localEngines);

      setIsLoadingData(false); // Render UI immediately

      // 2. Sync from Cloud Background
      if (isKVConfigured()) {
          addLog('info', "Found Vercel KV config. Syncing...");
          try {
              const [cloudCats, cloudSets, cloudEngines] = await Promise.all([
                syncCategoriesFromCloud(),
                syncSettingsFromCloud(),
                syncSearchEnginesFromCloud()
              ]);
              
              if (cloudCats) setCategories(cloudCats);
              if (cloudSets) {
                 // Ensure AI configs exist
                 if (!cloudSets.aiConfigs || cloudSets.aiConfigs.length === 0) {
                     cloudSets.aiConfigs = INITIAL_SETTINGS.aiConfigs;
                 }
                 setLocalSettings(cloudSets);
              }
              if (cloudEngines) setSearchEngines(cloudEngines);
              addLog('info', "Cloud sync complete");
          } catch (e) {
              addLog('error', `Cloud sync failed: ${e}`);
          }
      } else {
          addLog('warn', "Vercel KV not configured.");
          if (!process.env.KV_REST_API_URL) addLog('warn', "Missing Env: KV_REST_API_URL");
          if (!process.env.KV_REST_API_TOKEN) addLog('warn', "Missing Env: KV_REST_API_TOKEN");
      }
    };

    initData();

    // Greeting time
    const updateTime = () => {
      const hours = new Date().getHours();
      if (hours < 12) setCurrentTime('早上好');
      else if (hours < 18) setCurrentTime('下午好');
      else setCurrentTime('晚上好');
    };
    updateTime();
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch AI Greeting
  useEffect(() => {
    const fetchGreeting = async () => {
        if (!settings.enableAiGreeting) return;
        const CACHE_KEY = 'aurora_greeting_cache_v2';
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { text, expiry } = JSON.parse(cached);
            if (Date.now() < expiry) {
                setAiGreeting(text);
                return;
            }
        }
        const text = await getAiGreeting();
        if (text) {
            setAiGreeting(text);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                text,
                expiry: Date.now() + 4 * 60 * 60 * 1000 
            }));
        }
    };
    fetchGreeting();
  }, [settings.enableAiGreeting, settings.aiConfigs]);

  // Dark Mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // -- Derived State --
  const activeSearchEngine = searchEngines.find(e => e.id === settings.activeSearchEngineId) || searchEngines[0];
  const kvStatus = isKVConfigured();
  const totalLinks = categories.reduce((acc, cat) => acc + cat.links.length, 0);

  // -- Handlers --

  const handleAdminAccess = () => {
    if (isAuthenticated) {
      toggleEditMode();
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validPassword = process.env.ADMIN_PASSWORD;
    if (!validPassword) {
       setIsAuthenticated(true);
       setShowLoginModal(false);
       toggleEditMode();
       return;
    }
    if (passwordInput === validPassword) {
      setIsAuthenticated(true);
      setShowLoginModal(false);
      toggleEditMode();
      setLoginError('');
      setPasswordInput('');
    } else {
      setLoginError('密码错误，请重试');
    }
  };

  const toggleEditMode = () => setIsEditMode(!isEditMode);

  const handleAiConfigChange = (id: string, updates: Partial<AIProviderConfig>) => {
      const newConfigs = settings.aiConfigs.map(c => 
          c.id === id ? { ...c, ...updates } : c
      );
      if (updates.isActive) {
          newConfigs.forEach(c => {
              if (c.id !== id) c.isActive = false;
          });
      }
      setLocalSettings({ ...settings, aiConfigs: newConfigs });
  };

  const handleAddAiProvider = () => {
    const newConfig: AIProviderConfig = {
        id: `ai-custom-${Date.now()}`,
        name: '自定义 OpenAI 服务',
        type: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        isActive: false
    };
    setLocalSettings(prev => ({ ...prev, aiConfigs: [...prev.aiConfigs, newConfig] }));
    setEditingAiConfig(newConfig);
  };

  const handleDeleteAiProvider = (id: string) => {
    setConfirmModal({
        isOpen: true,
        message: '确定要删除这个 AI 服务配置吗？',
        onConfirm: () => {
            setLocalSettings(prev => ({
                ...prev,
                aiConfigs: prev.aiConfigs.filter(c => c.id !== id)
            }));
            if (editingAiConfig?.id === id) setEditingAiConfig(null);
            setConfirmModal(null);
        }
    });
  };

  const handleFetchModels = async (config: AIProviderConfig) => {
      setIsFetchingModels(true);
      const models = await fetchAiModels(config);
      if (models.length > 0) {
          setAvailableModels(models);
          // Auto fill first if default
          if (!config.model || config.model === 'gpt-3.5-turbo') {
              handleAiConfigChange(config.id, { model: models[0] });
          }
      } else {
          // Explicit feedback for user when manual refresh fails
          alert('无法自动获取模型列表 (可能是服务商未开放列表接口)。\n\n请直接在输入框中手动填写模型名称 (例如: deepseek-chat, longcat-flash 等)。');
      }
      setIsFetchingModels(false);
  };

  const handleTestConnection = async (config: AIProviderConfig) => {
      setTestStatus({ status: 'loading' });
      const result = await testAiConnection(config);
      setTestStatus({ 
          status: result.success ? 'success' : 'fail',
          message: result.message
      });
      
      if (result.success) {
          // Try fetching models silently to populate list
          const models = await fetchAiModels(config);
          if (models.length > 0) setAvailableModels(models);
      }
      setTimeout(() => setTestStatus({ status: 'idle' }), 5000);
  };

  const handleCategoryNameChange = (id: string, newTitle: string) => {
    const newCats = categories.map(cat => cat.id === id ? { ...cat, title: newTitle } : cat);
    setCategories(newCats);
  };

  const handleCategoryNameBlur = async (id: string, title: string) => {
    saveCategories(categories);
    try {
        const icon = await suggestIcon(title);
        const newCats = categories.map(cat => cat.id === id ? { ...cat, icon: icon } : cat);
        setCategories(newCats);
        saveCategories(newCats);
    } catch (e) {
        console.error(e);
    }
  };

  const handleDeleteLink = (catId: string, linkId: string) => {
    setConfirmModal({
        isOpen: true,
        message: '确定要删除这个链接吗？',
        onConfirm: () => {
            const newCats = categories.map(cat => {
            if (cat.id !== catId) return cat;
            return { ...cat, links: cat.links.filter(l => l.id !== linkId) };
            });
            setCategories(newCats);
            saveCategories(newCats);
            setConfirmModal(null);
        }
    });
  };

  const handleSaveLink = async () => {
    if (!editingLink || !linkForm.title || !linkForm.url) return;
    
    const newLink: LinkItem = {
      id: linkForm.id || `l-${Date.now()}`,
      title: linkForm.title,
      url: linkForm.url.startsWith('http') ? linkForm.url : `https://${linkForm.url}`,
      description: linkForm.description || '',
      color: linkForm.color || '#666'
    };

    const newCats = categories.map(cat => {
      if (cat.id !== editingLink.catId) return cat;
      if (editingLink.link) {
        return { ...cat, links: cat.links.map(l => l.id === editingLink.link!.id ? newLink : l) };
      } else {
        return { ...cat, links: [...cat.links, newLink] };
      }
    });

    setCategories(newCats);
    await saveCategories(newCats);
    setEditingLink(null);
    setLinkForm({});
  };

  const handleAiFillLink = async () => {
    if (!linkForm.url) return alert('请先输入 URL');
    setIsAiLoading(true);
    try {
      const data = await analyzeUrl(linkForm.url);
      setLinkForm(prev => ({
        ...prev,
        title: data.title,
        description: data.description,
        color: data.brandColor
      }));
    } catch (e) {
        alert('AI 识别失败，请查看系统诊断日志');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateCategoryLinks = async () => {
    if (!showGenLinksModal) return;
    setIsGeneratingLinks(true);
    try {
      const newLinksData = await generateCategoryLinks(showGenLinksModal.title, genCount);
      if (!newLinksData || newLinksData.length === 0) {
        alert("AI 生成未能返回结果。请转到「全局设置 -> 系统诊断」查看错误日志。");
        return;
      }
      const newLinks: LinkItem[] = newLinksData.map((l, i) => ({
        id: `gen-${Date.now()}-${i}`,
        title: l.title || 'Unknown',
        url: l.url || '#',
        description: l.description || '',
        color: l.color || '#666'
      }));
      const newCats = categories.map(cat => {
        if (cat.id !== showGenLinksModal.catId) return cat;
        return { ...cat, links: [...cat.links, ...newLinks] };
      });
      setCategories(newCats);
      await saveCategories(newCats);
      setShowGenLinksModal(null);
    } catch (e) {
        alert('AI 生成过程发生错误，请查看系统诊断日志');
    } finally {
      setIsGeneratingLinks(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    const url = activeSearchEngine.searchUrlPattern + encodeURIComponent(searchTerm);
    window.open(url, '_blank');
  };

  const handleSaveEngine = async () => {
    if (!engineForm.name || !engineForm.searchUrlPattern) return;
    
    const newEngine: SearchEngine = {
        id: `se-${Date.now()}`,
        name: engineForm.name,
        baseUrl: engineForm.baseUrl || 'https://google.com',
        searchUrlPattern: engineForm.searchUrlPattern
    };

    const newEngines = [...searchEngines, newEngine];
    setSearchEngines(newEngines);
    await saveSearchEngines(newEngines);
    setIsAddingEngine(false);
    setEngineForm({});
  };

  const handleDeleteEngine = (id: string) => {
      if (searchEngines.length <= 1) {
          alert("至少保留一个搜索引擎");
          return;
      }
      const doDelete = async () => {
        const newEngines = searchEngines.filter(e => e.id !== id);
        setSearchEngines(newEngines);
        await saveSearchEngines(newEngines);
        if (settings.activeSearchEngineId === id) {
            const newActive = newEngines[0].id;
            setLocalSettings(prev => ({...prev, activeSearchEngineId: newActive}));
            await saveSettings({...settings, activeSearchEngineId: newActive});
        }
        setConfirmModal(null);
      };

      setConfirmModal({
          isOpen: true,
          message: "确定删除这个搜索引擎吗？",
          onConfirm: doDelete
      });
  };

  const handleAiFillEngine = async () => {
      if (!engineForm.baseUrl) return alert('请先输入搜索引擎主页 URL');
      setIsAiLoading(true);
      try {
          const data = await analyzeUrl(engineForm.baseUrl);
          setEngineForm(prev => ({
              ...prev,
              name: data.title,
              searchUrlPattern: data.searchUrlPattern || ''
          }));
      } catch (e) {
          alert('AI 识别失败，请查看系统诊断日志');
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert('图片大小不能超过 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setLocalSettings(prev => ({...prev, customBackgroundImage: base64}));
            await saveSettings({...settings, customBackgroundImage: base64});
        };
        reader.readAsDataURL(file);
    }
  };

  const handleGenerateAppIcon = async () => {
      setIsAiLoading(true);
      try {
          const icon = await suggestIcon(settings.appName);
          setLocalSettings(prev => ({...prev, appIcon: icon}));
          await saveSettings({...settings, appIcon: icon});
      } catch (e) {
          alert("图标生成失败");
      } finally {
          setIsAiLoading(false);
      }
  };

  // Loading Screen
  if (isLoadingData) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                <p className="text-gray-500 animate-pulse">正在从云端同步数据...</p>
            </div>
        </div>
    );
  }

  // ... rest of the App component (render logic) remains the same
  // (We only changed the data loading logic above)

  return (
    <div className="min-h-screen flex text-gray-900 dark:text-gray-100 transition-colors duration-300 relative">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         {settings.backgroundMode === 'aurora' && (
             <>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-white/0 to-white/50 dark:from-slate-900/0 dark:to-slate-900/50" />
             </>
         )}
         {settings.backgroundMode === 'monotone' && (
             <div className="w-full h-full bg-gray-50 dark:bg-slate-950 transition-colors duration-500" />
         )}
         {settings.backgroundMode === 'custom' && settings.customBackgroundImage && (
             <div 
               className="w-full h-full bg-cover bg-center transition-all duration-500"
               style={{ backgroundImage: `url(${settings.customBackgroundImage})` }}
             >
                <div className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-sm" />
             </div>
         )}
      </div>

      {isEditMode && (
        <aside className="w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-gray-200 dark:border-white/5 flex flex-col transition-all z-20 sticky top-0 h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-violet-600/20">
                <Icon name={settings.appIcon} size={24} />
              </div>
              <span className="font-bold text-lg dark:text-white truncate">{settings.appName}</span>
            </div>

            <div className="space-y-1">
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">控制台</div>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 transition-colors"
              >
                <Settings size={18} />
                全局设置
              </button>
              <button 
                 onClick={async () => {
                   const newId = `cat-${Date.now()}`;
                   const newCat: Category = { id: newId, title: '新分类', icon: 'Folder', links: [] };
                   const updated = [...categories, newCat];
                   setCategories(updated);
                   await saveCategories(updated);
                 }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 transition-colors"
              >
                <Plus size={18} />
                新建分类
              </button>
            </div>
          </div>
          
          <div className="mt-auto p-6">
            <div className={cn("p-4 rounded-xl border flex items-center gap-2 mb-4 text-sm font-medium transition-colors", 
                kvStatus 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-700 dark:text-red-400'
            )}>
              <div className={cn("w-2 h-2 rounded-full animate-pulse", kvStatus ? 'bg-green-500' : 'bg-red-500')} />
              {kvStatus ? '已连接 Vercel KV' : '未连接云同步'}
            </div>
            <button 
              onClick={() => {
                toggleEditMode();
                setIsAuthenticated(false);
              }}
              className="w-full py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-medium hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> 退出管理
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 relative overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Header Area */}
          <div className="flex justify-between items-center relative z-10">
            {!isEditMode && (
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                    <Icon name={settings.appIcon} size={24} />
                 </div>
                 <h1 className="font-bold text-xl text-gray-800 dark:text-white">{settings.appName}</h1>
               </div>
            )}
            <div className="flex-1" /> {/* Spacer */}
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={async () => {
                         const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
                         setLocalSettings(prev => ({...prev, theme: newTheme}));
                         await saveSettings({...settings, theme: newTheme});
                    }} 
                    className="p-2.5 rounded-full bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-white/10 hover:bg-gray-50 transition-colors"
                >
                    {settings.theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
                </button>

                {!isEditMode ? (
                <button onClick={handleAdminAccess} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium border border-gray-100 dark:border-white/10 dark:text-gray-200">
                    <LayoutGrid size={16} /> 管理面板
                </button>
                ) : (
                <button onClick={toggleEditMode} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-medium shadow-lg hover:opacity-90 transition-opacity">
                    返回首页
                </button>
                )}
            </div>
          </div>

          {!isEditMode && (
            <div className="py-8 animate-fade-in-up flex flex-col items-center relative">
              <div className="mb-6 text-center select-none">
                 <div className="text-7xl md:text-8xl font-bold tracking-tighter text-gray-800 dark:text-white tabular-nums leading-none font-[system-ui]">
                     {clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                 </div>
                 <div className="text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium mt-2 tracking-wide">
                     {clock.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
                 </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-500 mb-6 text-center max-w-2xl leading-tight">
                {currentTime}，
                <span className="text-gray-800 dark:text-gray-100 block sm:inline sm:ml-2">
                    {aiGreeting || "愿你今天拥有无限灵感。"}
                </span>
              </h1>
              
              <div className="mt-4 w-full max-w-3xl mx-auto group">
                <form onSubmit={handleSearch} className="relative flex items-center p-2 glass-panel rounded-2xl transition-all group-focus-within:ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/5">
                  <div className="flex items-center justify-center pl-3 pr-2 border-r border-gray-200 dark:border-white/10 mr-2">
                     <Favicon url={activeSearchEngine.baseUrl} size={24} className="shadow-sm" />
                  </div>
                  <input 
                    type="text" 
                    placeholder={`${activeSearchEngine.name} 搜索...`}
                    className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 dark:text-white placeholder-gray-400 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button type="submit" className="p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors shadow-lg shadow-violet-600/30">
                    <Search size={20} />
                  </button>
                </form>

                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  {searchEngines.map(engine => (
                    <button
                      key={engine.id}
                      onClick={async () => {
                          setLocalSettings(prev => ({...prev, activeSearchEngineId: engine.id}));
                          await saveSettings({...settings, activeSearchEngineId: engine.id});
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium",
                        settings.activeSearchEngineId === engine.id 
                            ? 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700 shadow-sm' 
                            : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
                      )}
                    >
                      <Favicon url={engine.baseUrl} size={14} className="rounded-sm" />
                      {engine.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400 backdrop-blur-md shadow-sm transition-transform hover:scale-105 select-none">
                 <Globe size={14} className="text-violet-500" />
                 <span>已收录 <strong>{totalLinks}</strong> 个优质站点</span>
              </div>
            </div>
          )}
          
          <div className="space-y-8 pb-20">
            {categories.map((category) => (
              <div key={category.id} className={cn(isEditMode ? 'glass-panel p-6 rounded-3xl' : '', 'transition-all duration-300')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    {isEditMode ? <Icon name={category.icon} className="text-gray-800 dark:text-white" /> : <Icon name={category.icon} className="text-yellow-500 dark:text-yellow-400" />}
                    
                    {isEditMode ? (
                        <input 
                            value={category.title}
                            onChange={(e) => handleCategoryNameChange(category.id, e.target.value)}
                            onBlur={(e) => handleCategoryNameBlur(category.id, e.target.value)}
                            className="bg-transparent border-b border-dashed border-gray-400 dark:border-gray-500 text-lg font-bold text-gray-800 dark:text-gray-100 outline-none w-full max-w-[200px]"
                        />
                    ) : (
                        <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">{category.title}</h2>
                    )}

                  </div>
                  {isEditMode && (
                    <div className="flex gap-2">
                       <button className="px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-violet-100 transition-colors"
                        onClick={() => setShowGenLinksModal({catId: category.id, title: category.title})}
                       >
                         <Wand2 size={14} /> AI 填充
                       </button>
                       <button 
                        onClick={async () => {
                          const newCats = categories.filter(c => c.id !== category.id);
                          setCategories(newCats);
                          await saveCategories(newCats);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {category.links.map((link) => (
                    <div 
                      key={link.id}
                      onClick={() => !isEditMode && window.open(link.url, settings.openInNewTab ? '_blank' : '_self')}
                      className={cn(
                        "relative group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300",
                        isEditMode ? 'bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 cursor-move' : 'bg-white dark:bg-slate-800 hover:shadow-xl hover:-translate-y-1 cursor-pointer border border-transparent hover:border-violet-100 dark:hover:border-violet-900/30'
                      )}
                    >
                      <Favicon url={link.url} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{link.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{link.description}</p>
                      </div>
                      
                      {isEditMode && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm z-10">
                          <button onClick={(e) => { e.stopPropagation(); setEditingLink({ catId: category.id, link }); setLinkForm({...link}); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteLink(category.id, link.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isEditMode && (
                    <button 
                      onClick={() => {
                        setEditingLink({ catId: category.id });
                        setLinkForm({ color: '#666666' });
                      }}
                      className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-all min-h-[88px]"
                    >
                      <Plus size={20} />
                      <span className="font-medium">添加链接</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* --- Modals --- */}
      
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-white/20 relative">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
              <div className="flex flex-col items-center mb-6">
                 <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-full flex items-center justify-center mb-4">
                    <Lock size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white">管理员登录</h2>
                 <p className="text-sm text-gray-500 mt-2">请输入密码以进入管理面板</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                 <div>
                   <input 
                     type="password" 
                     value={passwordInput}
                     onChange={(e) => setPasswordInput(e.target.value)}
                     className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none text-center tracking-widest"
                     placeholder="••••••"
                     autoFocus
                   />
                   {loginError && (
                     <div className="flex items-center justify-center gap-2 text-red-500 text-xs mt-2">
                       <AlertCircle size={12} /> {loginError}
                     </div>
                   )}
                 </div>
                 <button type="submit" className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-colors">
                   验证身份
                 </button>
              </form>
           </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">确认操作</h3>
                <p className="text-gray-500 mb-6">{confirmModal.message}</p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setConfirmModal(null)}
                        className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={confirmModal.onConfirm}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                    >
                        确认删除
                    </button>
                </div>
            </div>
        </div>
      )}

      {showGenLinksModal && (
         <Modal title={`AI 生成: ${showGenLinksModal.title}`} onClose={() => setShowGenLinksModal(null)}>
            <div className="p-6 space-y-6">
               <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800 text-violet-800 dark:text-violet-200 text-sm leading-relaxed">
                  <div className="flex gap-2 items-start">
                     <Wand2 className="shrink-0 mt-0.5" size={16} />
                     <p>AI 将根据分类名称 <strong>"{showGenLinksModal.title}"</strong> 自动搜索并生成相关的高质量网站链接。</p>
                  </div>
               </div>

               <div>
                  <div className="flex justify-between mb-2">
                     <label className="text-sm font-bold text-gray-700 dark:text-gray-300">生成数量</label>
                     <span className="text-sm font-mono text-violet-600 font-bold">{genCount} 个</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" 
                    value={genCount} 
                    onChange={(e) => setGenCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                     <span>1</span>
                     <span>10</span>
                  </div>
               </div>

               <button 
                 onClick={handleGenerateCategoryLinks}
                 disabled={isGeneratingLinks}
                 className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-violet-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
               >
                 {isGeneratingLinks ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      正在思考中...
                    </>
                 ) : (
                    <>
                      <Wand2 size={20} />
                      开始生成
                    </>
                 )}
               </button>
            </div>
         </Modal>
      )}

      {showSettingsModal && (
        <Modal title="全局设置" onClose={() => setShowSettingsModal(false)}>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-900/50 rounded-xl mb-6 mx-6 mt-2 overflow-x-auto">
                <button 
                    onClick={() => setActiveSettingsTab('general')}
                    className={cn(
                        "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeSettingsTab === 'general' ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                >
                    <TypeIcon size={16} /> 站点
                </button>
                <button 
                    onClick={() => setActiveSettingsTab('ai')}
                    className={cn(
                        "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeSettingsTab === 'ai' ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                >
                    <Bot size={16} /> AI 模型
                </button>
                <button 
                    onClick={() => setActiveSettingsTab('appearance')}
                    className={cn(
                        "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeSettingsTab === 'appearance' ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                >
                    <Palette size={16} /> 外观
                </button>
                <button 
                    onClick={() => setActiveSettingsTab('search')}
                    className={cn(
                        "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeSettingsTab === 'search' ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                >
                    <Search size={16} /> 搜索
                </button>
                <button 
                    onClick={() => setActiveSettingsTab('diagnose')}
                    className={cn(
                        "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        activeSettingsTab === 'diagnose' ? 'bg-white dark:bg-slate-800 shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                >
                    <Activity size={16} /> 诊断
                </button>
            </div>

            <div className="px-6 pb-6 space-y-6 overflow-y-auto">
                {activeSettingsTab === 'general' && (
                    <div className="space-y-6 animate-fade-in">
                        <section className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">站点名称</label>
                                <input 
                                    type="text" 
                                    value={settings.appName}
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        setLocalSettings(prev => ({...prev, appName: val}));
                                        await saveSettings({...settings, appName: val});
                                    }}
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">站点 Logo (图标名称)</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900">
                                        <div className="w-8 h-8 flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-lg">
                                            <Icon name={settings.appIcon} size={20} />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={settings.appIcon}
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                setLocalSettings(prev => ({...prev, appIcon: val}));
                                                await saveSettings({...settings, appIcon: val});
                                            }}
                                            className="flex-1 bg-transparent border-none outline-none font-mono text-sm"
                                            placeholder="e.g. Zap, Home, Star"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleGenerateAppIcon}
                                        disabled={isAiLoading}
                                        className="px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg hover:shadow-violet-500/30 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-70"
                                    >
                                        {isAiLoading ? '...' : <><Wand2 size={16} /> AI 生成</>}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">支持 Lucide Icon 库中的任意图标名称。</p>
                            </div>
                        </section>
                    </div>
                )}

                {activeSettingsTab === 'ai' && (
                    <div className="space-y-6 animate-fade-in">
                       <div className="space-y-3">
                          {settings.aiConfigs.map((config, index) => (
                             <div key={config.id} className={cn(
                                 "rounded-xl border p-4 transition-all group",
                                 config.isActive 
                                    ? "bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-700"
                                    : "bg-white dark:bg-slate-900 border-gray-100 dark:border-white/5"
                             )}>
                                <div className="flex justify-between items-start mb-4">
                                   <div className="flex items-center gap-3">
                                      <button 
                                        onClick={() => handleAiConfigChange(config.id, { isActive: true })}
                                        className={cn(
                                            "w-10 h-6 rounded-full p-1 transition-colors relative shrink-0",
                                            config.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-slate-700"
                                        )}
                                      >
                                          <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", config.isActive ? "translate-x-4" : "")} />
                                      </button>
                                      <div>
                                          <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                              {config.name}
                                              <Settings size={14} className="text-gray-400 cursor-pointer hover:text-violet-500" onClick={() => {
                                                  if(editingAiConfig?.id === config.id) setEditingAiConfig(null);
                                                  else setEditingAiConfig(config);
                                              }} />
                                          </div>
                                          <div className="text-xs text-gray-400 font-mono mt-1 truncate max-w-[200px]">
                                              {config.type === 'google' ? 'Google SDK' : config.baseUrl || 'No Base URL'}
                                          </div>
                                      </div>
                                   </div>
                                   {config.type === 'openai' && (
                                       <button 
                                         onClick={() => handleDeleteAiProvider(config.id)}
                                         className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   )}
                                </div>

                                {(editingAiConfig?.id === config.id || config.isActive) && (
                                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/5 animate-fade-in">
                                        {config.type === 'openai' && (
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">服务名称</label>
                                                <input 
                                                    type="text"
                                                    value={config.name}
                                                    onChange={(e) => handleAiConfigChange(config.id, { name: e.target.value })}
                                                    className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/10 text-sm focus:border-violet-500 outline-none"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex justify-between">
                                                <span>API 密钥来源</span>
                                                <span className="text-[10px] font-normal text-gray-400">仅用于检测或本地保存</span>
                                            </label>
                                            {config.type === 'openai' && (
                                                <div className="flex gap-2 mb-2 text-xs">
                                                    <button 
                                                        onClick={() => handleAiConfigChange(config.id, { envSlot: undefined })}
                                                        className={cn("px-2 py-1 rounded border", !config.envSlot ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300" : "border-transparent text-gray-500")}
                                                    >
                                                        手动输入
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAiConfigChange(config.id, { envSlot: 'CUSTOM_API_KEY_1' })}
                                                        className={cn("px-2 py-1 rounded border", config.envSlot ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300" : "border-transparent text-gray-500")}
                                                    >
                                                        环境变量
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 relative">
                                                    {config.envSlot ? (
                                                        <div className="relative">
                                                            <select
                                                                value={config.envSlot}
                                                                onChange={(e) => handleAiConfigChange(config.id, { envSlot: e.target.value })}
                                                                className="w-full p-2.5 pl-9 rounded-lg bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/10 text-sm font-mono outline-none focus:border-violet-500 appearance-none"
                                                            >
                                                                <option value="CUSTOM_API_KEY_1">CUSTOM_API_KEY_1</option>
                                                                <option value="CUSTOM_API_KEY_2">CUSTOM_API_KEY_2</option>
                                                                <option value="CUSTOM_API_KEY_3">CUSTOM_API_KEY_3</option>
                                                                <option value="CUSTOM_API_KEY_4">CUSTOM_API_KEY_4</option>
                                                                <option value="CUSTOM_API_KEY_5">CUSTOM_API_KEY_5</option>
                                                            </select>
                                                            <Server size={14} className="absolute left-3 top-3 text-violet-500" />
                                                            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <input 
                                                                type="password"
                                                                value={config.apiKey}
                                                                onChange={(e) => handleAiConfigChange(config.id, { apiKey: e.target.value })}
                                                                placeholder={config.type === 'google' && !config.apiKey ? '使用环境变量 API_KEY' : 'sk-.......'}
                                                                className="w-full p-2.5 pl-9 rounded-lg bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/10 text-sm font-mono outline-none focus:border-violet-500 transition-colors"
                                                            />
                                                            <Key size={14} className="absolute left-3 top-3 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <button 
                                                  onClick={() => handleTestConnection(config)}
                                                  className={cn(
                                                      "px-4 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 shrink-0 relative group",
                                                      testStatus.status === 'idle' ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50" :
                                                      testStatus.status === 'loading' ? "bg-gray-100 dark:bg-slate-800 text-gray-400" :
                                                      testStatus.status === 'success' ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600" :
                                                      "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600"
                                                  )}
                                                >
                                                    {testStatus.status === 'success' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                                    {testStatus.status === 'fail' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                    
                                                    {testStatus.status === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : 
                                                     testStatus.status === 'idle' ? <Zap size={14} /> : null}
                                                    
                                                    {testStatus.status === 'idle' ? '检测' : testStatus.status === 'loading' ? '检测中' : testStatus.status === 'success' ? '通畅' : '失败'}
                                                </button>
                                            </div>
                                            {config.type === 'google' && !config.apiKey && (
                                                <p className="text-[10px] text-gray-400 mt-1 pl-1">未填写则默认使用 Vercel 环境变量 API_KEY</p>
                                            )}
                                        </div>

                                        {config.type === 'openai' && (
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">API 地址 (Base URL)</label>
                                                <input 
                                                    type="text"
                                                    value={config.baseUrl}
                                                    onChange={(e) => handleAiConfigChange(config.id, { baseUrl: e.target.value })}
                                                    className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/10 text-sm font-mono outline-none focus:border-violet-500 transition-colors"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1 pl-1">例如: https://api.longcat.chat/openai (无需末尾 /v1)</p>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase block">模型</label>
                                                <button 
                                                   onClick={() => handleFetchModels(config)}
                                                   disabled={isFetchingModels}
                                                   className="text-[10px] text-violet-500 hover:text-violet-600 flex items-center gap-1"
                                                >
                                                    <RefreshCw size={10} className={cn(isFetchingModels ? "animate-spin" : "")} /> 刷新列表
                                                </button>
                                            </div>
                                            
                                            <div className="relative">
                                                <input 
                                                    list={`models-${config.id}`}
                                                    value={config.model}
                                                    onChange={(e) => handleAiConfigChange(config.id, { model: e.target.value })}
                                                    className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/10 text-sm font-mono outline-none focus:border-violet-500 transition-colors"
                                                    placeholder="输入或选择模型..."
                                                />
                                                <datalist id={`models-${config.id}`}>
                                                    {availableModels.length > 0 ? (
                                                        availableModels.map(m => <option key={m} value={m} />)
                                                    ) : (
                                                        <>
                                                            <option value="gemini-2.5-flash" />
                                                            <option value="gpt-3.5-turbo" />
                                                            <option value="gpt-4o" />
                                                            <option value="longcat-flash" />
                                                            <option value="deepseek-chat" />
                                                            <option value="claude-3-opus" />
                                                        </>
                                                    )}
                                                </datalist>
                                            </div>
                                            {testStatus.status === 'success' && testStatus.message?.includes('模型') && (
                                                <div className="mt-2 flex items-start gap-1.5 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-lg border border-yellow-200 dark:border-yellow-900/30 text-[10px]">
                                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                                    <p>注意：API 连接成功，但当前填写的模型名称可能不被支持。请尝试点击“刷新列表”或手动填写。</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                             </div>
                          ))}
                          <button 
                            onClick={handleAddAiProvider}
                            className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-500 hover:border-violet-400 hover:text-violet-600 font-medium transition-all flex items-center justify-center gap-2"
                          >
                             <Plus size={16} /> 添加自定义 OpenAI 服务
                          </button>
                       </div>
                    </div>
                )}

                {activeSettingsTab === 'appearance' && (
                    <div className="space-y-6 animate-fade-in">
                        <section>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">背景风格</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'aurora', name: '极光流体', icon: <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-blue-500" /> },
                                    { id: 'monotone', name: '纯净单色', icon: <div className="w-5 h-5 bg-gray-300 rounded-full" /> },
                                    { id: 'custom', name: '自定义壁纸', icon: <ImageIcon size={20} className="text-violet-500" /> }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={async () => {
                                            const newSettings = { ...settings, backgroundMode: mode.id as any };
                                            setLocalSettings(newSettings);
                                            await saveSettings(newSettings);
                                        }}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            settings.backgroundMode === mode.id 
                                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' 
                                            : 'border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'
                                        )}
                                    >
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                            {mode.icon}
                                        </div>
                                        <span className={cn("text-xs font-bold", settings.backgroundMode === mode.id ? 'text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400')}>{mode.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                         {settings.backgroundMode === 'custom' && (
                             <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-white/5 space-y-3 animate-fade-in">
                                 <h4 className="text-sm font-bold text-gray-700 dark:text-white">自定义壁纸设置</h4>
                                 <input 
                                     type="text" 
                                     placeholder="输入图片 URL..." 
                                     value={settings.customBackgroundImage || ''}
                                     onChange={async (e) => {
                                         const val = e.target.value;
                                         setLocalSettings(prev => ({...prev, customBackgroundImage: val}));
                                         await saveSettings({...settings, customBackgroundImage: val});
                                     }}
                                     className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                 />
                                 <div className="relative">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <button className="w-full py-2.5 bg-white dark:bg-slate-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:text-violet-600 hover:border-violet-400 transition-colors flex items-center justify-center gap-2">
                                        <Upload size={16} /> 上传本地图片 (Max 2MB)
                                    </button>
                                 </div>
                             </div>
                        )}

                        <div className="h-px bg-gray-100 dark:bg-white/5" />

                        <section>
                            <div className="flex justify-between mb-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">卡片透明度</h3>
                                <span className="text-xs font-bold text-gray-500">{settings.cardOpacity}%</span>
                            </div>
                            <input 
                            type="range" min="0" max="100" 
                            value={settings.cardOpacity} 
                            onChange={async (e) => {
                                const val = parseInt(e.target.value);
                                setLocalSettings(prev => ({...prev, cardOpacity: val}));
                                await saveSettings({...settings, cardOpacity: val});
                            }}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                            />
                        </section>
                    </div>
                )}

                {activeSettingsTab === 'search' && (
                    <div className="space-y-4 animate-fade-in">
                         {searchEngines.map(engine => (
                            <div key={engine.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <Favicon url={engine.baseUrl} size={20} />
                                    <div>
                                        <div className="font-medium text-sm text-gray-900 dark:text-white">{engine.name}</div>
                                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{engine.searchUrlPattern}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteEngine(engine.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                         {!isAddingEngine ? (
                            <button 
                                onClick={() => setIsAddingEngine(true)}
                                className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-500 hover:border-violet-400 hover:text-violet-600 font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> 添加搜索引擎
                            </button>
                        ) : (
                            <div className="p-4 bg-violet-50 dark:bg-violet-900/10 rounded-xl border border-violet-100 dark:border-violet-900/20 space-y-3 animate-fade-in">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="主页 URL (如 bing.com)" 
                                        value={engineForm.baseUrl || ''}
                                        onChange={e => setEngineForm({...engineForm, baseUrl: e.target.value})}
                                        className="flex-1 p-2 rounded-lg text-sm border border-gray-200 dark:border-white/10 dark:bg-slate-900"
                                    />
                                     <button 
                                        onClick={handleAiFillEngine}
                                        disabled={isAiLoading}
                                        className="px-3 bg-violet-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isAiLoading ? '...' : <><Wand2 size={12}/> AI 识别</>}
                                    </button>
                                </div>
                                <input 
                                     type="text" 
                                     placeholder="显示名称" 
                                     value={engineForm.name || ''}
                                     onChange={e => setEngineForm({...engineForm, name: e.target.value})}
                                     className="w-full p-2 rounded-lg text-sm border border-gray-200 dark:border-white/10 dark:bg-slate-900"
                                />
                                 <input 
                                     type="text" 
                                     placeholder="搜索串格式 (自动生成或手动填写)" 
                                     value={engineForm.searchUrlPattern || ''}
                                     onChange={e => setEngineForm({...engineForm, searchUrlPattern: e.target.value})}
                                     className="w-full p-2 rounded-lg text-xs font-mono text-gray-500 border border-gray-200 dark:border-white/10 dark:bg-slate-900"
                                />
                                <div className="flex gap-2 pt-2">
                                    <button onClick={handleSaveEngine} className="flex-1 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg text-sm font-bold">确认添加</button>
                                    <button onClick={() => { setIsAddingEngine(false); setEngineForm({}); }} className="px-4 py-2 bg-transparent text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-sm">取消</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeSettingsTab === 'diagnose' && (
                  <div className="space-y-6 animate-fade-in">
                     <section className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-white/5 space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">环境变量检查</h3>
                        
                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Google API Key (API_KEY)</span>
                              {process.env.API_KEY && process.env.API_KEY.length > 5 ? (
                                <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                                   <CheckCircle2 size={14} /> 已配置 (ENV)
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold">
                                   <XCircle size={14} /> 未配置
                                </div>
                              )}
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vercel KV (KV_REST_API_URL)</span>
                              {process.env.KV_REST_API_URL && process.env.KV_REST_API_URL.length > 10 ? (
                                <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                                   <CheckCircle2 size={14} /> 已配置
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold">
                                   <XCircle size={14} /> 未配置
                                </div>
                              )}
                           </div>
                        </div>

                        {(!process.env.API_KEY || !process.env.KV_REST_API_URL) && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                                <h4 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={12}/> 配置指南</h4>
                                <ul className="text-[10px] text-red-800 dark:text-red-300 space-y-1 list-disc list-inside">
                                    {!process.env.API_KEY && <li>请在 Vercel 环境变量设置中添加 <code>API_KEY</code> (Google Gemini)。</li>}
                                    {!process.env.KV_REST_API_URL && <li>请在 Vercel Storage 中创建一个 KV 数据库并连接到本项目，然后重新部署 (Redeploy)。</li>}
                                </ul>
                            </div>
                        )}
                     </section>

                     <section className="space-y-2">
                        <div 
                            className="flex justify-between items-center cursor-pointer select-none group"
                            onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                        >
                           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors">
                              {isLogsExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                              运行日志
                           </h3>
                           <button onClick={(e) => { e.stopPropagation(); clearLogs(); }} className="text-[10px] text-gray-400 hover:text-red-500">清空</button>
                        </div>
                        
                        {isLogsExpanded && (
                            <div className="w-full h-64 bg-gray-900 text-gray-300 font-mono text-xs p-3 rounded-xl overflow-y-auto border border-gray-800 shadow-inner animate-fade-in-down">
                            {logs.length === 0 ? (
                                <span className="text-gray-600 italic">暂无日志...</span>
                            ) : (
                                logs.map((log) => (
                                <div key={log.id} className="mb-1.5 border-b border-gray-800 pb-1.5 last:border-0">
                                    <span className="text-gray-500 mr-2">[{log.time}]</span>
                                    <span className={cn(
                                    "font-bold mr-2 uppercase text-[10px]",
                                    log.level === 'error' ? 'text-red-500' : 
                                    log.level === 'warn' ? 'text-yellow-500' : 'text-blue-500'
                                    )}>
                                    {log.level}
                                    </span>
                                    <span className="break-all whitespace-pre-wrap">{log.message}</span>
                                </div>
                                ))
                            )}
                            </div>
                        )}
                     </section>
                  </div>
                )}
            </div>
            
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-slate-800 rounded-b-2xl">
              <button 
                onClick={async () => {
                    await saveSettings(settings);
                    setShowSettingsModal(false);
                }}
                className="w-full py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                保存并关闭
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ... Edit Modals ... */}
      {editingLink && (
        <Modal title={editingLink.link ? '编辑链接' : '新建链接'} onClose={() => { setEditingLink(null); setLinkForm({}); }}>
           <div className="p-6 flex flex-col md:flex-row gap-8">
             <div className="flex-1 space-y-5">
               <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">URL 地址</label>
                 <div className="flex gap-2">
                   <input 
                    type="text" 
                    value={linkForm.url || ''}
                    onChange={(e) => setLinkForm({...linkForm, url: e.target.value})}
                    placeholder="https://example.com"
                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                   />
                   <button 
                    onClick={handleAiFillLink}
                    disabled={isAiLoading}
                    className="px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg hover:shadow-violet-500/30 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-70"
                   >
                     {isAiLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Wand2 size={16} />}
                     AI 识别
                   </button>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">标题名称</label>
                 <input 
                    type="text" 
                    value={linkForm.title || ''}
                    onChange={(e) => setLinkForm({...linkForm, title: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none"
                   />
               </div>

               <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">描述信息</label>
                 <textarea 
                    value={linkForm.description || ''}
                    onChange={(e) => setLinkForm({...linkForm, description: e.target.value})}
                    rows={3}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                   />
               </div>

               <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">品牌主题色</label>
                 <div className="flex items-center gap-3 p-2 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-slate-900">
                   <input 
                    type="color" 
                    value={linkForm.color || '#666666'}
                    onChange={(e) => setLinkForm({...linkForm, color: e.target.value})}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                   />
                   <span className="text-gray-500 font-mono">{linkForm.color}</span>
                 </div>
               </div>
               
               <button 
                onClick={handleSaveLink}
                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-lg hover:shadow-xl hover:-translate-y-0.5 transition-all mt-4"
               >
                 保存修改
               </button>
             </div>

             <div className="w-full md:w-72 border-l border-gray-100 dark:border-white/5 pl-0 md:pl-8 flex flex-col items-center justify-center">
               <h4 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider">实时预览</h4>
               <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                      {linkForm.url ? (
                         <img src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${linkForm.url}&sz=64`} alt="icon" />
                      ) : (
                         <Globe size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 dark:text-white truncate">{linkForm.title || '标题'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{linkForm.description || '描述信息...'}</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 text-gray-300">
                    <Globe size={12} />
                  </div>
               </div>
               <p className="mt-8 text-center text-xs text-gray-400 leading-relaxed px-4">
                 这是链接在仪表盘上的显示效果。<br/>
                 AI 自动识别功能可以帮助你快速填充信息。
               </p>
             </div>
           </div>
        </Modal>
      )}

    </div>
  );
};

export default App;