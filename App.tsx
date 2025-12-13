
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Plus, Search, Moon, Sun, LayoutGrid, 
  LogOut, Edit3, Trash2, X, Wand2, Globe, AlertCircle, 
  Image as ImageIcon, Upload, Palette, Type as TypeIcon, Lock,
  Activity, CheckCircle2, XCircle, Terminal, Bot, Zap, RefreshCw, Key, Server, AlertTriangle, ChevronDown, ChevronRight,
  Flame, ChevronUp, ThumbsUp, ThumbsDown, Monitor, Cpu, Paintbrush, Radio, Link as LinkIcon, Power, Share2, MoreHorizontal, QrCode
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

// --- Helper Components ---
const LoadingSpinner = () => (
    <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-600 rounded-full animate-spin" />
);

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
  const [isAddingEngine, setIsAddingEngine] = useState(false);
  const [genCount, setGenCount] = useState(4);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Social Form
  const [socialForm, setSocialForm] = useState<Partial<SocialLink>>({});
  const [isAddingSocial, setIsAddingSocial] = useState(false);

  // AI Config Forms
  const [editingAiConfig, setEditingAiConfig] = useState<AIProviderConfig | null>(null);
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'fail', message?: string }>({ status: 'idle' });
  
  // --- Logic ---

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

  useEffect(() => { 
      const unsub = subscribeLogs(() => setLogs(getLogs())); 
      setLogs(getLogs()); 
      addLog('info', '系统初始化完成 (System Init)');
      return unsub; 
  }, []);

  // Persistent Login Check
  useEffect(() => {
      const auth = localStorage.getItem('aurora_auth');
      if (auth === 'true') {
          setIsAuthenticated(true);
      }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoadingData(true);
      let localCats = await loadCategories();
      const localSets = await loadSettings();
      const localEngines = await loadSearchEngines();

      if (localCats) { setCategories(updateCommonRecommendations(localCats)); }
      else { setCategories(updateCommonRecommendations(INITIAL_DATA)); }
      
      if (localSets) {
          const mergedSettings = { ...INITIAL_SETTINGS, ...localSets };
          if (!localSets.socialLinks) mergedSettings.socialLinks = INITIAL_SETTINGS.socialLinks;
          setLocalSettings(mergedSettings);
      }
      if (localEngines) setSearchEngines(localEngines);

      setIsLoadingData(false);

      if (isKVConfigured()) {
          try {
              const [c, s, e] = await Promise.all([syncCategoriesFromCloud(), syncSettingsFromCloud(), syncSearchEnginesFromCloud()]);
              if (c) setCategories(updateCommonRecommendations(c));
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

  const toggleTheme = () => {
      const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
      setLocalSettings(prev => ({...prev, theme: newTheme}));
      saveSettings({...settings, theme: newTheme});
      addLog('info', `主题切换为: ${newTheme}`);
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

  // --- Handlers ---

  const handleLinkClick = async (category: Category, link: LinkItem) => {
      window.open(link.url, settings.openInNewTab ? '_blank' : '_self');
      const newCats = categories.map(cat => {
          if (cat.id === COMMON_REC_ID) return cat;
          const hasLink = cat.links.some(l => l.url === link.url);
          return hasLink ? { ...cat, links: cat.links.map(l => l.url === link.url ? { ...l, clickCount: (l.clickCount || 0) + 1 } : l) } : cat;
      });
      const finalCats = updateCommonRecommendations(newCats);
      setCategories(finalCats);
      await saveCategories(finalCats);
  };

  const handleSettingsClick = () => {
      if (isAuthenticated) {
          setIsEditMode(true);
      } else {
          setShowLoginModal(true);
      }
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
      addLog('warn', '管理员登录失败: 密码错误');
    }
  };

  const handleLogout = () => {
      setIsEditMode(false);
      setIsAuthenticated(false);
      localStorage.removeItem('aurora_auth');
      setActiveTab('dashboard');
      addLog('info', '管理员退出登录');
  };

  const handleSaveLink = async () => {
    if (!editingLink || !linkForm.title || !linkForm.url) return;
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
    newCats = updateCommonRecommendations(newCats);
    setCategories(newCats);
    await saveCategories(newCats);
    setEditingLink(null);
    setLinkForm({});
    addLog('info', `链接已保存: ${newLink.title}`);
  };

  const handleAiFillLink = async () => {
    if (!linkForm.url) return alert('请输入 URL');
    setIsAiLoading(true);
    addLog('info', `正在 AI 识别链接: ${linkForm.url}`);
    try {
      const data = await analyzeUrl(linkForm.url);
      setLinkForm(prev => ({ ...prev, title: data.title, description: data.description, color: data.brandColor, pros: data.pros, cons: data.cons }));
      addLog('info', `链接识别成功: ${data.title}`);
    } catch (e) { 
        alert('AI 识别失败, 请检查日志'); 
        addLog('error', 'AI 链接识别失败');
    } finally { setIsAiLoading(false); }
  };

  const handleGenerateCategoryLinks = async () => {
    if (!showGenLinksModal) return;
    setIsGeneratingLinks(true);
    addLog('info', `开始为分类 "${showGenLinksModal.title}" 生成内容`);
    try {
      const existing = categories.find(c => c.id === showGenLinksModal.catId)?.links.map(l => l.url) || [];
      const newLinks = await generateCategoryLinks(showGenLinksModal.title, genCount, existing);
      if (!newLinks.length) {
          addLog('warn', 'AI 未返回任何链接');
          return alert("AI 无响应, 请检查日志");
      }
      
      const mappedLinks = newLinks.map(l => ({
          id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: l.title!, url: l.url!, description: l.description || '', color: l.color, clickCount: 0, pros: l.pros, cons: l.cons
      }));
      
      let newCats = categories.map(cat => cat.id !== showGenLinksModal.catId ? cat : { ...cat, links: [...cat.links, ...mappedLinks] });
      newCats = updateCommonRecommendations(newCats);
      setCategories(newCats);
      await saveCategories(newCats);
      setShowGenLinksModal(null);
      addLog('info', `成功生成 ${mappedLinks.length} 个链接`);
    } catch { 
        alert('生成失败, 请检查配置'); 
        addLog('error', 'AI 批量生成失败');
    } finally { setIsGeneratingLinks(false); }
  };

  const handleAiIconGenerate = async (catId: string, title: string) => {
      if (!title) return;
      setIsAiLoading(true);
      try {
          const icon = await suggestIcon(title);
          const newCats = categories.map(c => c.id === catId ? { ...c, icon } : c);
          setCategories(newCats);
          await saveCategories(newCats);
          addLog('info', `Icon 更新成功: ${icon} for ${title}`);
      } catch {
          addLog('error', `Icon 生成失败: ${title}`);
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleAutoIconOnBlur = (catId: string, title: string, currentIcon: string) => {
      // If icon is generic 'Folder' or empty, and title is present, try to auto-generate
      if (title && (currentIcon === 'Folder' || !currentIcon)) {
          handleAiIconGenerate(catId, title);
      }
  };

  const handleAiConfigChange = async (id: string, updates: Partial<AIProviderConfig>) => {
      let newConfigs = settings.aiConfigs.map(c => c.id === id ? { ...c, ...updates } : c);
      if (updates.isActive) {
          newConfigs = newConfigs.map(c => ({ ...c, isActive: c.id === id }));
      }
      const newSettings = { ...settings, aiConfigs: newConfigs };
      setLocalSettings(newSettings);
      await saveSettings(newSettings);
      addLog('info', 'AI 配置已更新');
  };

  const handleTestConnection = async (config: AIProviderConfig) => {
      setTestStatus({ status: 'loading' });
      addLog('info', `测试 AI 连接: ${config.name}`);
      const result = await testAiConnection(config);
      setTestStatus({ status: result.success ? 'success' : 'fail', message: result.message });
      addLog(result.success ? 'info' : 'error', `AI 连接测试结果: ${result.message}`);
      setTimeout(() => setTestStatus({ status: 'idle' }), 3000);
  };

  const handleDeleteAiProvider = async (id: string) => {
      if (settings.aiConfigs.length <= 1) return alert("至少保留一个 AI 配置");
      let newConfigs = settings.aiConfigs.filter(c => c.id !== id);
      if (!newConfigs.some(c => c.isActive)) newConfigs[0].isActive = true;
      const newSettings = { ...settings, aiConfigs: newConfigs };
      setLocalSettings(newSettings);
      await saveSettings(newSettings);
      if (editingAiConfig?.id === id) setEditingAiConfig(null);
      addLog('warn', '删除了一个 AI 配置');
  };

  const handleAddAiProvider = async () => {
      const newConfig: AIProviderConfig = { id: `ai-${Date.now()}`, name: '新 AI 服务', type: 'openai', baseUrl: '', apiKey: '', model: 'gpt-4o', isActive: false };
      const newConfigs = [...settings.aiConfigs, newConfig];
      const newSettings = { ...settings, aiConfigs: newConfigs };
      setLocalSettings(newSettings);
      await saveSettings(newSettings);
      setEditingAiConfig(newConfig);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg' | 'qrcode') => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("文件过大 (限制 2MB)");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      if (result) {
         if (type === 'qrcode') {
             setSocialForm(prev => ({...prev, qrCode: result}));
         } else {
             const updates = type === 'logo' ? { customLogoUrl: result, logoMode: 'image' as const } : { customBackgroundImage: result };
             const newSettings = { ...settings, ...updates };
             setLocalSettings(newSettings);
             await saveSettings(newSettings);
             addLog('info', `图片上传成功 (${type})`);
         }
      }
    };
    reader.readAsDataURL(file);
  };

  const autoFillSearchEngine = (url: string) => {
      if (!url) return;
      addLog('info', `尝试识别搜索引擎: ${url}`);
      try {
          const fullUrl = url.startsWith('http') ? url : `https://${url}`;
          const urlObj = new URL(fullUrl);
          const hostname = urlObj.hostname.replace('www.', '');
          const name = hostname.split('.')[0];
          const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
          
          let pattern = '';
          if (hostname.includes('google')) pattern = `${fullUrl.replace(/\/$/, '')}/search?q=`;
          else if (hostname.includes('baidu')) pattern = `${fullUrl.replace(/\/$/, '')}/s?wd=`;
          else if (hostname.includes('bing')) pattern = `${fullUrl.replace(/\/$/, '')}/search?q=`;
          else pattern = `${fullUrl.replace(/\/$/, '')}/search?q=`;

          setEngineForm(prev => ({
              ...prev,
              baseUrl: fullUrl,
              name: capitalized,
              searchUrlPattern: pattern
          }));
      } catch {
          alert("无效的 URL");
      }
  };

  const getUniqueSiteCount = () => {
      const urls = new Set<string>();
      categories.forEach(c => {
          if (c.id === COMMON_REC_ID) return;
          c.links.forEach(l => urls.add(l.url));
      });
      return urls.size;
  };

  // --- Render Sections ---

  const renderDashboard = () => (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* --- Top Header (Logo + DarkMode) --- */}
      {!isEditMode && (
          <header className="flex items-center justify-between py-6 animate-fade-in-down">
              <div className="flex items-center gap-3">
                  {settings.logoMode === 'icon' ? (
                      <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/30"><Icon name={settings.appIcon} size={24}/></div>
                  ) : (
                      <img src={settings.customLogoUrl} className="w-10 h-10 rounded-xl object-contain bg-white/80 backdrop-blur shadow-sm" />
                  )}
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">{settings.appName}</h1>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-sm">
                      {settings.theme === 'dark' ? <Moon size={20} className="text-indigo-400"/> : <Sun size={20} className="text-amber-500"/>}
                  </button>
                  <button onClick={handleSettingsClick} className="w-10 h-10 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-sm group">
                      <Settings size={20} className="text-gray-500 dark:text-gray-400 group-hover:rotate-90 transition-transform"/>
                  </button>
              </div>
          </header>
      )}

      {!isEditMode && (
          <div className="flex flex-col items-center py-10 mb-10 animate-fade-in-up">
              <div className="text-center mb-10 select-none">
                  <h1 className="text-6xl md:text-7xl font-bold tracking-tighter tabular-nums mb-4 drop-shadow-sm bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                      {clock.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', second: '2-digit'})}
                  </h1>
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">{clock.toLocaleDateString('zh-CN', {month:'long', day:'numeric', weekday:'long'})}</div>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                      <span className="text-gray-400 font-normal mr-2">{currentTime}，</span>
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
              
              <div className="mt-8 px-6 py-2 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur text-xs text-gray-400 border border-white/10 flex items-center gap-2">
                  <Globe size={12}/> 已收录 <span className="font-bold text-gray-600 dark:text-gray-300">{getUniqueSiteCount()}</span> 个优质站点
              </div>
          </div>
      )}

      {categories.map((category, catIndex) => {
        const isCommonRecs = category.id === COMMON_REC_ID;
        const isExpanded = expandedCategories.has(category.id);
        
        // Show max 8 for common recs (no expander), max 4 for others unless expanded/editing
        const limit = isCommonRecs ? 8 : 4;
        const shouldCollapse = !isEditMode && !isCommonRecs && category.links.length > limit && !isExpanded;
        const visibleLinks = (isEditMode || isExpanded || (isCommonRecs && !isEditMode)) ? category.links : category.links.slice(0, limit);
        // Ensure common recs never shows more than 8 in view mode
        const finalLinks = (!isEditMode && isCommonRecs) ? visibleLinks.slice(0, 8) : visibleLinks;

        return (
        <div key={category.id} className={cn("transition-all duration-300", isEditMode ? 'p-6 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-slate-800/30' : '')}>
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-3 flex-1">
              <div className={cn("p-2 rounded-xl", !isEditMode && "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/10")}>
                  <Icon name={category.icon} size={24} />
              </div>
              {isEditMode ? (
                  <div className="flex items-center gap-2">
                      <input 
                        value={category.title} 
                        onChange={(e) => setCategories(cats => cats.map(c => c.id === category.id ? { ...c, title: e.target.value } : c))} 
                        onBlur={() => handleAutoIconOnBlur(category.id, category.title, category.icon)}
                        className="bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-violet-500 text-xl font-bold outline-none w-full max-w-[200px]" 
                      />
                      <button onClick={() => handleAiIconGenerate(category.id, category.title)} disabled={isAiLoading} className="p-1.5 bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200 transition-colors" title="AI 生成图标">
                          {isAiLoading ? <LoadingSpinner/> : <Wand2 size={14}/>}
                      </button>
                  </div>
              ) : (
                  <div className="flex items-center gap-3">
                      <h2 className="font-bold text-xl text-gray-800 dark:text-gray-100">{category.title}</h2>
                      {!isEditMode && !isCommonRecs && category.links.length > 4 && (
                          <button onClick={() => toggleCategoryExpand(category.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                              {isExpanded ? <ChevronUp size={16} /> : <MoreHorizontal size={16} />}
                          </button>
                      )}
                  </div>
              )}
            </div>
            {isEditMode && category.id !== COMMON_REC_ID && (
              <div className="flex gap-2">
                 <button onClick={() => setShowGenLinksModal({catId: category.id, title: category.title})} className="px-3 py-1.5 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-violet-200"><Wand2 size={12} /> AI 填充</button>
                 <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"/>
                 <button onClick={() => { const n = [...categories]; [n[catIndex], n[catIndex-1]] = [n[catIndex-1], n[catIndex]]; setCategories(n); saveCategories(n); }} disabled={catIndex <= 1} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 disabled:opacity-30"><ChevronUp size={16}/></button>
                 <button onClick={() => { const n = [...categories]; [n[catIndex], n[catIndex+1]] = [n[catIndex+1], n[catIndex]]; setCategories(n); saveCategories(n); }} disabled={catIndex === categories.length-1} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 disabled:opacity-30"><ChevronDown size={16}/></button>
                 <button onClick={() => { const n = categories.filter(c => c.id !== category.id); setCategories(n); saveCategories(n); addLog('warn', `删除了分类: ${category.title}`); }} className="p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"><Trash2 size={16}/></button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {finalLinks.map((link) => (
              <div key={link.id} onClick={() => !isEditMode && handleLinkClick(category, link)} className={cn("group relative flex flex-col p-5 rounded-2xl transition-all duration-300 h-full border", isEditMode ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:border-violet-400 cursor-move shadow-sm' : 'bg-white/80 dark:bg-slate-800/80 border-transparent hover:border-violet-200 dark:hover:border-violet-500/30 hover:shadow-xl hover:-translate-y-1 backdrop-blur-sm cursor-pointer')}>
                <div className="flex items-start gap-4 mb-3">
                   <Favicon url={link.url} size={40} className="shadow-md rounded-xl" />
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate text-[15px]">{link.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-5 h-10 line-clamp-2 overflow-hidden">{link.description}</p>
                   </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                   {link.pros && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-medium border border-emerald-100 dark:border-emerald-500/20 max-w-full truncate"><CheckCircle2 size={10} className="shrink-0"/> {link.pros}</span>}
                   {link.cons && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 text-[10px] font-medium border border-rose-100 dark:border-rose-500/20 max-w-full truncate"><XCircle size={10} className="shrink-0"/> {link.cons}</span>}
                </div>
                {isEditMode && category.id !== COMMON_REC_ID && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm z-10 border border-gray-100 dark:border-gray-700">
                    <button onClick={(e) => { e.stopPropagation(); setEditingLink({ catId: category.id, link }); setLinkForm({...link}); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit3 size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmModal({isOpen: true, message: '删除链接?', onConfirm: () => { const n = categories.map(c => c.id===category.id?{...c, links: c.links.filter(l=>l.id!==link.id)}:c); setCategories(updateCommonRecommendations(n)); saveCategories(n); setConfirmModal(null); }}); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
            {isEditMode && category.id !== COMMON_REC_ID && (
              <button onClick={() => { setEditingLink({ catId: category.id }); setLinkForm({ color: '#666666' }); }} className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-all min-h-[140px] hover:bg-violet-50 dark:hover:bg-violet-900/10 group">
                <div className="p-3 rounded-full bg-gray-100 dark:bg-white/5 group-hover:bg-white group-hover:shadow-md transition-all"><Plus size={20} /></div><span className="font-bold text-xs">添加链接</span>
              </button>
            )}
          </div>
          {!isEditMode && !isCommonRecs && category.links.length > 4 && (
              <div className="mt-4 flex justify-center">
                  <button onClick={() => toggleCategoryExpand(category.id)} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                      {isExpanded ? <>收起 <ChevronUp size={14}/></> : <>查看更多 ({category.links.length - 4}) <ChevronDown size={14}/></>}
                  </button>
              </div>
          )}
        </div>
        );
      })}
      
      {isEditMode && (
          <button onClick={async () => { const n = [...categories, { id: `cat-${Date.now()}`, title: '新分类', icon: 'Folder', links: [] }]; setCategories(n); await saveCategories(n); }} className="w-full py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl text-gray-400 hover:text-violet-600 hover:border-violet-400 hover:bg-white/50 dark:hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><Plus size={32} className="text-gray-400 group-hover:text-violet-600"/></div><span className="font-bold text-lg tracking-wide">创建新分类</span>
          </button>
      )}

      {/* --- Footer --- */}
      {!isEditMode && (
          <footer className="py-10 text-center border-t border-gray-100 dark:border-white/5 mt-20 space-y-6">
              <div className="flex justify-center gap-4">
                  {settings.socialLinks?.map(link => (
                      <div key={link.id} className="relative group">
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-violet-600 hover:text-white transition-all shadow-sm"
                            title={link.platform}
                          >
                              <Icon name={link.icon} size={20}/>
                          </a>
                          {/* QR Code Popover */}
                          {link.qrCode && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-50 animate-scale-in">
                                  <div className="p-2 bg-white rounded-xl shadow-xl border border-gray-100">
                                      <img src={link.qrCode} alt={`${link.platform} QR`} className="w-32 h-32 object-contain rounded-lg"/>
                                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-gray-100"></div>
                                  </div>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500 font-medium" dangerouslySetInnerHTML={{ __html: settings.footerHtml || '' }}></div>
          </footer>
      )}
    </div>
  );

  const renderSettingsGeneral = () => (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6">基础设置</h2>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">站点名称</label>
                  <input type="text" value={settings.appName} onChange={e => {setLocalSettings(p=>({...p, appName:e.target.value})); saveSettings({...settings, appName:e.target.value})}} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none transition-all"/>
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">个性化称呼 (用于欢迎语)</label>
                  <input type="text" value={settings.userName || ''} placeholder="例如: 极客, 站长" onChange={e => {setLocalSettings(p=>({...p, userName:e.target.value})); saveSettings({...settings, userName:e.target.value})}} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none transition-all"/>
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">页脚内容 (支持 HTML)</label>
                  <input type="text" value={settings.footerHtml || ''} placeholder="例如: © 2024 My Site" onChange={e => {setLocalSettings(p=>({...p, footerHtml:e.target.value})); saveSettings({...settings, footerHtml:e.target.value})}} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none transition-all font-mono text-xs"/>
              </div>
              <div className="pt-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">站点图标</label>
                  <div className="flex items-center gap-4 mb-4">
                      <button onClick={()=>{setLocalSettings(p=>({...p, logoMode:'icon'})); saveSettings({...settings, logoMode:'icon'})}} className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2", settings.logoMode==='icon' ? "bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300" : "border-gray-200 dark:border-gray-700 text-gray-500")}><Icon name="Zap" size={16}/> Lucide Icon</button>
                      <button onClick={()=>{setLocalSettings(p=>({...p, logoMode:'image'})); saveSettings({...settings, logoMode:'image'})}} className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2", settings.logoMode==='image' ? "bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300" : "border-gray-200 dark:border-gray-700 text-gray-500")}><ImageIcon size={16}/> 自定义图片</button>
                  </div>
                  {settings.logoMode === 'icon' ? (
                      <div className="flex gap-3">
                          <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-xl flex items-center justify-center shrink-0"><Icon name={settings.appIcon}/></div>
                          <input type="text" value={settings.appIcon} onChange={e => {setLocalSettings(p=>({...p, appIcon:e.target.value})); saveSettings({...settings, appIcon:e.target.value})}} className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none transition-all"/>
                          <button onClick={async()=>{setIsAiLoading(true); try{const i=await suggestIcon(settings.appName); setLocalSettings(p=>({...p, appIcon:i})); saveSettings({...settings, appIcon:i});}catch{}finally{setIsAiLoading(false);}}} disabled={isAiLoading} className="px-5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-colors flex items-center gap-2">{isAiLoading?<LoadingSpinner/>:<Wand2 size={16}/>} AI</button>
                      </div>
                  ) : (
                      <div className="space-y-2">
                          <div className="flex gap-3">
                              {settings.customLogoUrl ? <img src={settings.customLogoUrl} className="w-12 h-12 rounded-xl object-contain bg-gray-100 dark:bg-gray-800 border" /> : <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 border border-dashed flex items-center justify-center text-gray-400"><ImageIcon size={20}/></div>}
                              <input type="text" value={settings.customLogoUrl || ''} onChange={e => {setLocalSettings(p=>({...p, customLogoUrl:e.target.value})); saveSettings({...settings, customLogoUrl:e.target.value})}} placeholder="输入图片 URL 或上传" className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none"/>
                          </div>
                          <div className="relative">
                              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <button className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors flex items-center justify-center gap-2"><Upload size={16}/> 点击上传图片 (Max 2MB)</button>
                          </div>
                      </div>
                  )}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">社交媒体链接 (页脚显示)</label>
                  <div className="space-y-3">
                      {settings.socialLinks?.map(link => (
                          <div key={link.id} className="flex gap-2">
                              <div className="w-10 h-10 bg-gray-50 dark:bg-slate-900 rounded-lg flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700 text-gray-500">
                                  <Icon name={link.icon} size={18}/>
                              </div>
                              <div className="flex-1 grid grid-cols-3 gap-2">
                                  <div className="p-2.5 bg-gray-50 dark:bg-slate-900 rounded-lg text-sm border border-gray-200 dark:border-gray-700 truncate text-gray-500 col-span-1">{link.platform}</div>
                                  <div className="p-2.5 bg-gray-50 dark:bg-slate-900 rounded-lg text-sm border border-gray-200 dark:border-gray-700 truncate text-gray-500 col-span-2 flex items-center justify-between">
                                      <span>{link.url || (link.qrCode ? '已配置二维码' : '无链接')}</span>
                                      {link.qrCode && <QrCode size={14} className="text-violet-500"/>}
                                  </div>
                              </div>
                              <button onClick={() => {
                                  const n = settings.socialLinks.filter(l => l.id !== link.id);
                                  setLocalSettings(p => ({...p, socialLinks: n}));
                                  saveSettings({...settings, socialLinks: n});
                              }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                          </div>
                      ))}
                      
                      {isAddingSocial ? (
                          <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 animate-scale-in">
                              <div className="grid grid-cols-2 gap-3">
                                  <input value={socialForm.platform||''} onChange={e=>setSocialForm({...socialForm, platform:e.target.value})} placeholder="平台名称 (e.g. WeChat)" className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none"/>
                                  <div className="flex gap-2">
                                      <input value={socialForm.icon||''} onChange={e=>setSocialForm({...socialForm, icon:e.target.value})} placeholder="图标 (e.g. MessageCircle)" className="flex-1 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none"/>
                                      <button onClick={async()=>{ if(socialForm.platform) { setIsAiLoading(true); try{const i=await suggestIcon(socialForm.platform); setSocialForm(p=>({...p, icon:i}));}catch{}finally{setIsAiLoading(false);} } }} className="p-2 bg-violet-100 text-violet-600 rounded-lg" title="AI Match Icon"><Wand2 size={16}/></button>
                                  </div>
                              </div>
                              <input value={socialForm.url||''} onChange={e=>setSocialForm({...socialForm, url:e.target.value})} placeholder="URL (或者上传二维码)" className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none"/>
                              
                              <div className="flex items-center gap-3">
                                  <div className="relative overflow-hidden flex-1 py-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-500 hover:text-violet-500 hover:border-violet-300 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'qrcode')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                      <QrCode size={14}/> {socialForm.qrCode ? '二维码已上传' : '上传二维码 (微信/公众号)'}
                                  </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                  <button onClick={() => {setIsAddingSocial(false); setSocialForm({})}} className="px-3 py-1.5 text-xs font-bold text-gray-500">取消</button>
                                  <button onClick={() => {
                                      if(socialForm.platform) {
                                          const n = [...(settings.socialLinks || []), { id: `sl-${Date.now()}`, platform: socialForm.platform, url: socialForm.url || '#', icon: socialForm.icon || 'Link', qrCode: socialForm.qrCode }];
                                          setLocalSettings(p => ({...p, socialLinks: n}));
                                          saveSettings({...settings, socialLinks: n});
                                          setIsAddingSocial(false); setSocialForm({});
                                          addLog('info', `添加社交链接: ${socialForm.platform}`);
                                      }
                                  }} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold">添加</button>
                              </div>
                          </div>
                      ) : (
                          <button onClick={() => setIsAddingSocial(true)} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:text-violet-600 font-medium flex items-center justify-center gap-2 hover:bg-violet-50 dark:hover:bg-violet-900/10"><Plus size={16}/> 添加社交链接</button>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );

  const renderAiSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6">AI 服务配置</h2>
        <div className="grid gap-4">
            {settings.aiConfigs.map(config => (
                <div key={config.id} className={cn("p-5 rounded-2xl border transition-all relative overflow-hidden", config.isActive ? "bg-violet-600 text-white border-violet-500 shadow-xl shadow-violet-500/20" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700")}>
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 font-bold text-lg">{config.name} {config.isActive && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">当前使用</span>}</div>
                            <div className={cn("text-sm mt-1", config.isActive ? "text-violet-100" : "text-gray-500")}>{config.type === 'google' ? 'Google Gemini SDK' : 'OpenAI Compatible'} • {config.model}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingAiConfig(config)} className={cn("p-2 rounded-lg transition-colors", config.isActive ? "bg-white/10 hover:bg-white/20" : "hover:bg-gray-100 dark:hover:bg-gray-700")}><Settings size={18}/></button>
                            {!config.isActive && <button onClick={() => handleAiConfigChange(config.id, { isActive: true })} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-bold hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900/30 dark:hover:text-violet-300 transition-colors">启用</button>}
                        </div>
                    </div>
                </div>
            ))}
            <button onClick={handleAddAiProvider} className="py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-400 hover:text-violet-600 hover:border-violet-400 font-bold transition-all flex items-center justify-center gap-2"><Plus size={20}/> 添加新服务</button>
        </div>
    </div>
  );

  const renderSearchSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6">搜索引擎</h2>
        <div className="space-y-4">
            {searchEngines.map(se => (
                <div key={se.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Favicon url={se.baseUrl} size={32} className="rounded-lg"/>
                    <div className="flex-1">
                        <div className="font-bold">{se.name}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{se.searchUrlPattern}</div>
                    </div>
                    {se.id !== 'se-google' && <button onClick={() => { setSearchEngines(s => s.filter(x => x.id !== se.id)); saveSearchEngines(searchEngines.filter(x => x.id !== se.id)); addLog('warn', `删除搜索引擎: ${se.name}`); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>}
                </div>
            ))}
            <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="font-bold text-sm text-gray-500">添加新引擎</div>
                <div className="flex gap-3">
                    <div className="flex-1 flex gap-2">
                        <input value={engineForm.baseUrl||''} onChange={e => {setEngineForm({...engineForm, baseUrl: e.target.value});}} placeholder="URL (e.g. baidu.com)" className="flex-1 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 outline-none text-sm"/>
                        <button onClick={() => autoFillSearchEngine(engineForm.baseUrl || '')} className="px-3 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-violet-200 flex items-center gap-1"><Zap size={14}/> 智能识别</button>
                    </div>
                    <input value={engineForm.name||''} onChange={e => setEngineForm({...engineForm, name: e.target.value})} placeholder="名称" className="w-24 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 outline-none text-sm"/>
                </div>
                <input value={engineForm.searchUrlPattern||''} onChange={e => setEngineForm({...engineForm, searchUrlPattern: e.target.value})} placeholder="搜索 URL Pattern (e.g. https://.../s?q=)" className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 outline-none text-sm font-mono"/>
                <button onClick={() => {
                    if (engineForm.name && engineForm.searchUrlPattern) {
                        const n = [...searchEngines, { id: `se-${Date.now()}`, name: engineForm.name, baseUrl: engineForm.baseUrl || '', searchUrlPattern: engineForm.searchUrlPattern }];
                        setSearchEngines(n); saveSearchEngines(n); setEngineForm({});
                        addLog('info', `添加搜索引擎: ${engineForm.name}`);
                    }
                }} disabled={!engineForm.name} className="w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50">添加</button>
            </div>
        </div>
    </div>
  );

  const renderAppearanceSettings = () => (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6">外观与效果</h2>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
               {/* ... (Appearance settings content kept same, logic is fine) ... */}
               <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">背景模式</label>
                  <div className="grid grid-cols-3 gap-3">
                      {['aurora', 'monotone', 'custom'].map(m => (
                          <button key={m} onClick={() => {setLocalSettings(p=>({...p, backgroundMode: m as any})); saveSettings({...settings, backgroundMode: m as any})}} className={cn("py-3 rounded-xl border font-bold capitalize transition-all", settings.backgroundMode === m ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300" : "border-gray-200 dark:border-gray-700 text-gray-500")}>
                              {m === 'aurora' ? '极光' : m === 'monotone' ? '纯色' : '自定义'}
                          </button>
                      ))}
                  </div>
               </div>
               
               {settings.backgroundMode === 'custom' && (
                   <div className="space-y-3 animate-fade-in">
                       <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">自定义背景图</label>
                       <div className="flex gap-3">
                           <input type="text" value={settings.customBackgroundImage || ''} onChange={e => {setLocalSettings(p=>({...p, customBackgroundImage:e.target.value})); saveSettings({...settings, customBackgroundImage:e.target.value})}} placeholder="图片 URL" className="flex-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none"/>
                           <div className="relative overflow-hidden w-10 flex items-center justify-center bg-gray-100 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/30 text-gray-500 hover:text-violet-600 transition-colors">
                               <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} className="absolute inset-0 opacity-0 cursor-pointer"/>
                               <Upload size={18}/>
                           </div>
                       </div>
                   </div>
               )}

               <div className="space-y-6">
                   <div>
                       <div className="flex justify-between mb-2"><label className="text-sm font-bold">背景模糊度</label><span className="text-xs text-gray-400">{settings.backgroundBlur}px</span></div>
                       <input type="range" min="0" max="100" value={settings.backgroundBlur} onChange={e => {setLocalSettings(p=>({...p, backgroundBlur: Number(e.target.value)})); saveSettings({...settings, backgroundBlur: Number(e.target.value)})}} className="w-full accent-violet-600"/>
                   </div>
                   <div>
                       <div className="flex justify-between mb-2"><label className="text-sm font-bold">背景遮罩浓度</label><span className="text-xs text-gray-400">{settings.backgroundMaskOpacity}%</span></div>
                       <input type="range" min="0" max="90" value={settings.backgroundMaskOpacity} onChange={e => {setLocalSettings(p=>({...p, backgroundMaskOpacity: Number(e.target.value)})); saveSettings({...settings, backgroundMaskOpacity: Number(e.target.value)})}} className="w-full accent-violet-600"/>
                   </div>
                   <div>
                       <div className="flex justify-between mb-2"><label className="text-sm font-bold">卡片透明度</label><span className="text-xs text-gray-400">{settings.cardOpacity}%</span></div>
                       <input type="range" min="20" max="100" value={settings.cardOpacity} onChange={e => {setLocalSettings(p=>({...p, cardOpacity: Number(e.target.value)})); saveSettings({...settings, cardOpacity: Number(e.target.value)})}} className="w-full accent-violet-600"/>
                   </div>
               </div>
               
               <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                   <div className="flex items-center gap-3">
                       <div className="p-2 bg-violet-100 text-violet-600 rounded-lg"><Bot size={20}/></div>
                       <div>
                           <div className="font-bold text-sm">AI 欢迎语</div>
                           <div className="text-xs text-gray-400">每天生成一句新问候</div>
                       </div>
                   </div>
                   <button onClick={() => {setLocalSettings(p=>({...p, enableAiGreeting: !p.enableAiGreeting})); saveSettings({...settings, enableAiGreeting: !settings.enableAiGreeting})}} className={cn("w-12 h-6 rounded-full transition-colors relative", settings.enableAiGreeting ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700")}>
                       <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", settings.enableAiGreeting ? "left-7" : "left-1")}/>
                   </button>
               </div>
          </div>
      </div>
  );

  const renderDiagnose = () => (
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 animate-fade-in pb-10">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">系统诊断</h2>
              <button onClick={clearLogs} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg text-sm font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">清空日志</button>
          </div>

          {/* Logs (Grow to fill space) */}
          <div className="flex-1 bg-black/90 rounded-2xl p-6 overflow-hidden flex flex-col font-mono text-sm border border-gray-800 shadow-xl min-h-[300px]">
              <div className="text-gray-500 text-xs font-bold uppercase mb-2 tracking-wider">System Logs</div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                  {logs.length === 0 && <div className="text-gray-600 italic text-center py-20">暂无日志记录</div>}
                  {logs.map(log => (
                      <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded">
                          <span className="text-gray-500 shrink-0">[{log.time}]</span>
                          <span className={cn("uppercase font-bold shrink-0 w-16", log.level==='error'?'text-red-500':log.level==='warn'?'text-yellow-500':'text-blue-400')}>{log.level}</span>
                          <span className="text-gray-300 break-all whitespace-pre-wrap">{log.message}</span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Env Checks (Bottom) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">诊断环境变量检查</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="font-mono text-sm">API_KEY</span>
                      {process.env.API_KEY ? <span className="text-emerald-500 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={14}/> 已配置</span> : <span className="text-red-500 flex items-center gap-1 text-xs font-bold"><XCircle size={14}/> 未配置</span>}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="font-mono text-sm">KV_REST_API_URL</span>
                      {isKVConfigured() ? <span className="text-emerald-500 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={14}/> 已配置</span> : <span className="text-red-500 flex items-center gap-1 text-xs font-bold"><XCircle size={14}/> 未配置</span>}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="font-mono text-sm">ADMIN_PASSWORD</span>
                      {process.env.ADMIN_PASSWORD ? <span className="text-emerald-500 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={14}/> 已配置</span> : <span className="text-yellow-500 flex items-center gap-1 text-xs font-bold"><AlertCircle size={14}/> 默认</span>}
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-300 relative overflow-x-hidden selection:bg-violet-500/30", settings.theme === 'dark' ? 'bg-[#0B0C15] text-gray-100' : 'bg-gray-50 text-gray-900')}>
        {/* Background Layer */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            {settings.backgroundMode === 'aurora' && (
               <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-500/20 blur-[120px] rounded-full mix-blend-screen animate-blob"/>
                  <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full mix-blend-screen animate-blob animation-delay-2000"/>
                  <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-fuchsia-500/10 blur-[120px] rounded-full mix-blend-screen animate-blob animation-delay-4000"/>
               </div>
            )}
            {settings.backgroundMode === 'custom' && settings.customBackgroundImage && (
                <div className="absolute inset-0 bg-cover bg-center transition-opacity" style={{ backgroundImage: `url(${settings.customBackgroundImage})`, filter: `blur(${settings.backgroundBlur}px)` }}/>
            )}
            <div className="absolute inset-0 bg-white/50 dark:bg-[#0B0C15]/50 transition-colors" style={{ opacity: settings.backgroundMaskOpacity / 100 }}/>
        </div>

        {/* Modals */}
        {showLoginModal && (
            <Modal title="管理员登录" onClose={() => setShowLoginModal(false)} icon={<Lock size={20}/>}>
                <form onSubmit={handleLogin} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">管理密码</label>
                        <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none transition-all" autoFocus/>
                        {loginError && <p className="text-red-500 text-sm mt-2">{loginError}</p>}
                    </div>
                    <button type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/30">进入后台</button>
                    <div className="text-center text-xs text-gray-400">默认密码请查看环境变量配置</div>
                </form>
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

        {showGenLinksModal && (
            <Modal title={`AI 生成推荐: ${showGenLinksModal.title}`} onClose={() => setShowGenLinksModal(null)} icon={<Wand2 size={20}/>}>
                <div className="p-6 space-y-6">
                    <div className="p-4 bg-violet-50 dark:bg-violet-900/10 rounded-xl text-violet-800 dark:text-violet-200 text-sm leading-relaxed">
                        AI 将分析该分类，并推荐 <span className="font-bold">{genCount}</span> 个最相关的优质网站。此过程消耗 Token。
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

        {editingAiConfig && (
            <Modal title="编辑 AI 服务" onClose={() => { setEditingAiConfig(null); setTestStatus({ status: 'idle' }); }} icon={<Bot size={20}/>}>
                <div className="p-6 space-y-4">
                    {/* ... (AI Config modal content same as before) ... */}
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
                        <label className="block text-sm font-bold mb-2 text-gray-500">API Key</label>
                        {editingAiConfig.type === 'google' ? (
                            <div className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-slate-800 text-gray-500 text-sm italic">
                                Uses process.env.API_KEY
                            </div>
                        ) : (
                            <input type="password" value={editingAiConfig.apiKey} onChange={e=>setEditingAiConfig({...editingAiConfig, apiKey:e.target.value})} placeholder="sk-..." className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none font-mono text-sm"/>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-gray-500">模型名称</label>
                        <input value={editingAiConfig.model} onChange={e=>setEditingAiConfig({...editingAiConfig, model:e.target.value})} placeholder="gpt-4o / gemini-2.5-flash" className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 outline-none font-mono text-sm"/>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => handleTestConnection(editingAiConfig)} disabled={testStatus.status === 'loading'} className={cn("flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2", testStatus.status === 'success' ? "bg-green-500 text-white" : testStatus.status === 'fail' ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200")}>
                            {testStatus.status === 'loading' ? <LoadingSpinner/> : testStatus.status === 'success' ? <CheckCircle2 size={16}/> : testStatus.status === 'fail' ? <AlertTriangle size={16}/> : <Activity size={16}/>}
                            {testStatus.status === 'loading' ? '测试中' : testStatus.status === 'success' ? '连接成功' : testStatus.status === 'fail' ? '连接失败' : '测试连接'}
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
                        }} className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg font-bold text-sm hover:bg-violet-700">保存配置</button>
                    </div>
                    {testStatus.message && <div className="text-xs text-center text-gray-400">{testStatus.message}</div>}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={() => handleDeleteAiProvider(editingAiConfig.id)} className="w-full py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Trash2 size={16}/> 删除此配置</button>
                    </div>
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

        {/* Main Content Area */}
        {!isEditMode ? (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {renderDashboard()}
            </main>
        ) : (
            <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0B0C15] relative z-10">
                {/* Sidebar */}
                <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-20 shadow-xl">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/30"><Settings size={18}/></div>
                             <div className="font-bold text-lg tracking-tight">管理后台</div>
                         </div>
                         <button onClick={() => setIsEditMode(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="退出编辑"><Power size={18}/></button>
                    </div>
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <button onClick={() => setActiveTab('dashboard')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all", activeTab === 'dashboard' ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                            <LayoutGrid size={18}/> 仪表盘 / 链接
                        </button>
                        <button onClick={() => setActiveTab('general')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all", activeTab === 'general' ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                            <Settings size={18}/> 基础设置
                        </button>
                        <button onClick={() => setActiveTab('ai')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all", activeTab === 'ai' ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                            <Bot size={18}/> AI 服务
                        </button>
                        <button onClick={() => setActiveTab('appearance')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all", activeTab === 'appearance' ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                            <Palette size={18}/> 外观效果
                        </button>
                        <button onClick={() => setActiveTab('search')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all", activeTab === 'search' ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                            <Search size={18}/> 搜索引擎
                        </button>
                        <button onClick={() => setActiveTab('diagnose')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all", activeTab === 'diagnose' ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                            <Terminal size={18}/> 系统日志
                        </button>
                    </nav>
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                        <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl mb-2 text-xs font-bold transition-colors", isKVConfigured() ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400")}>
                            <div className={cn("w-2 h-2 rounded-full animate-pulse", isKVConfigured() ? "bg-emerald-500" : "bg-red-500")}></div>
                            {isKVConfigured() ? "已连接 Vercel KV" : "未连接云同步"}
                        </div>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                            <LogOut size={18}/> 退出登录
                        </button>
                    </div>
                </aside>
                
                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto relative p-8">
                     {activeTab === 'dashboard' && renderDashboard()}
                     {activeTab === 'general' && renderSettingsGeneral()}
                     {activeTab === 'ai' && renderAiSettings()}
                     {activeTab === 'appearance' && renderAppearanceSettings()}
                     {activeTab === 'search' && renderSearchSettings()}
                     {activeTab === 'diagnose' && renderDiagnose()}
                </main>
            </div>
        )}
    </div>
  );
};
