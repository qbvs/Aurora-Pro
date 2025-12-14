
import React, { useState, useEffect } from 'react';
import { 
  Settings, Plus, Search, Moon, Sun, LayoutGrid, 
  LogOut, Edit, Trash2, X, Wand2, AlertCircle, 
  Image as ImageIcon, Upload, Palette, Type as TypeIcon, Lock,
  Activity, CircleCheck, Bot, Key, Server, TriangleAlert, ChevronDown, ChevronRight,
  ChevronUp, Link as LinkIcon, Power, QrCode, Sparkles, ScanLine, Menu, Terminal, Monitor,
  Home, ArrowLeft, Clock, Compass, Calendar, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudHail, CloudSnow, CloudRainWind, CloudLightning, Thermometer,
  ShieldCheck, ShieldAlert
} from 'lucide-react';
import { 
  Category, LinkItem, AppSettings, SearchEngine, 
  LogEntry, AIProviderConfig, SocialLink 
} from './types';
import { addLog, subscribeLogs, getLogs, clearLogs, initLogger } from './services/logger';
import { INITIAL_DATA, INITIAL_SETTINGS, INITIAL_SEARCH_ENGINES } from './constants';
import { 
  loadCategories, saveCategories, loadSettings, saveSettings, 
  loadSearchEngines, saveSearchEngines, verifyCloudConnection,
  syncCategoriesFromCloud, syncSettingsFromCloud, syncSearchEnginesFromCloud
} from './services/storageService';
import { analyzeUrl, generateCategoryLinks, getAiGreeting, suggestIcon, testAiConnection, askSimpleQuestion } from './services/geminiService';
import { Icon } from './components/Icon';
import { Favicon } from './components/Favicon';
import { Modal } from './components/Modal';
import { cn } from './utils';
import { AiCommandPanel } from './components/AiCommandPanel';

// --- Constants ---
const COMMON_REC_ID = 'rec-1'; 

// --- Helper Functions ---
const isFaviconValid = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const hostname = new URL(url).hostname;
            if (!hostname) { resolve(false); return; }
            resolve(true); 
        } catch {
            resolve(false);
        }
    });
};

const getFormattedDate = () => {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    return `${month}月${day}日 ${weekday}`;
};

const mapWeatherCode = (code: number): { icon: string; text: string } => {
    if (code === 0) return { icon: 'Sun', text: '晴' };
    if ([1, 2, 3].includes(code)) return { icon: 'Cloud', text: '多云' };
    if ([45, 48].includes(code)) return { icon: 'CloudFog', text: '雾' };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: 'CloudDrizzle', text: '小雨' };
    if ([61, 63, 65, 66, 67].includes(code)) return { icon: 'CloudRain', text: '雨' };
    if ([71, 73, 75, 77].includes(code)) return { icon: 'CloudSnow', text: '雪' };
    if ([80, 81, 82].includes(code)) return { icon: 'CloudRainWind', text: '阵雨' };
    if ([95, 96, 99].includes(code)) return { icon: 'CloudLightning', text: '雷暴' };
    return { icon: 'Thermometer', text: '未知' };
};


const LoadingSpinner = () => <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />;

// --- Toast Component ---
interface ToastMsg { id: number; type: 'success' | 'error' | 'info'; msg: string; }
const ToastContainer: React.FC<{ toasts: ToastMsg[]; remove: (id: number) => void }> = ({ toasts, remove }) => (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className={cn("pointer-events-auto min-w-[300px] p-4 rounded-2xl shadow-lg border backdrop-blur-xl animate-fade-in flex items-center gap-3", 
                t.type === 'error' ? "bg-red-950/80 border-red-500/30 text-red-200" : 
                t.type === 'success' ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200" :
                "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-200"
            )}>
                {t.type === 'error' ? <AlertCircle size={20} className="text-red-400"/> : t.type === 'success' ? <CircleCheck size={20} className="text-emerald-400"/> : <Activity size={20} className="text-blue-400"/>}
                <span className="text-sm font-medium flex-1">{t.msg}</span>
                <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100 transition-opacity"><X size={16}/></button>
            </div>
        ))}
    </div>
);

// --- Main App Component ---

type SidebarTab = 'dashboard' | 'general' | 'ai' | 'appearance' | 'search' | 'diagnose';
type CloudSyncStatus = 'checking' | 'connected' | 'disconnected';

export const App: React.FC = () => {
  // -- Data State --
  const [categories, setCategories] = useState<Category[]>(INITIAL_DATA);
  const [settings, setLocalSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(INITIAL_SEARCH_ENGINES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // -- UI State --
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // -- New UI State --
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('checking');
  const [brokenLinks, setBrokenLinks] = useState<Set<string>>(new Set());
  const [showQrModal, setShowQrModal] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [viewCategory, setViewCategory] = useState<string | null>(null); // Controls Focus Mode
  const [clickedLinkId, setClickedLinkId] = useState<string | null>(null); // For click animation
  const [isDark, setIsDark] = useState(true); // Internal state for easier rendering logic
  const [draggedItem, setDraggedItem] = useState<{ catId: string; index: number } | null>(null); // Dragging State

  // -- Inputs --
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // -- Dynamic Content --
  const [greetingTime, setGreetingTime] = useState<string>('');
  const [aiGreeting, setAiGreeting] = useState<string>('');
  const [clock, setClock] = useState(new Date()); 
  const [dateInfo, setDateInfo] = useState<string>('');
  const [weatherInfo, setWeatherInfo] = useState<{ icon: string; text: string } | 'loading' | 'error' | null>(null);

  // -- Modals & Editing --
  const [editingLink, setEditingLink] = useState<{ catId: string, link?: LinkItem } | null>(null);
  const [showGenLinksModal, setShowGenLinksModal] = useState<{catId: string, title: string} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  
  // Forms
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({});
  const [engineForm, setEngineForm] = useState<Partial<SearchEngine>>({});
  const [genCount, setGenCount] = useState(4);
  const [genTopic, setGenTopic] = useState(''); 
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isIconSuggesting, setIsIconSuggesting] = useState(false);

  // Social Form
  const [socialForm, setSocialForm] = useState<Partial<SocialLink>>({});
  const [showSocialQrInput, setShowSocialQrInput] = useState(false);

  // Add Category State
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // AI Config Forms
  const [editingAiConfig, setEditingAiConfig] = useState<AIProviderConfig | null>(null);
  const [aiKeySource, setAiKeySource] = useState<'manual' | 'env'>('manual');
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'fail', message?: string }>({ status: 'idle' });
  
  // --- Logic ---
  const addToast = (type: 'success' | 'error' | 'info', msg: string) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, type, msg }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const updateCommonRecommendations = (cats: Category[]): Category[] => {
      let allLinks: LinkItem[] = [];
      const seenUrls = new Set<string>();
      if (!cats) return [];
      cats.forEach(cat => {
          if (cat.id === COMMON_REC_ID) return;
          if (cat.links) {
              cat.links.forEach(link => {
                 const normalizedUrl = link.url.trim().replace(/\/$/, '');
                 if (!seenUrls.has(normalizedUrl)) {
                     allLinks.push(link);
                     seenUrls.add(normalizedUrl);
                 }
              });
          }
      });
      allLinks.sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));
      const topLinks = allLinks.slice(0, 8);
      const newCommonCat: Category = {
          id: COMMON_REC_ID, title: '常用推荐', icon: 'Flame',
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
    initLogger();
    const init = async () => {
      // Step 1: Load local data first for a fast initial render
      try {
          const [localCats, localSets, localEngines] = await Promise.all([loadCategories(), loadSettings(), loadSearchEngines()]);
          if (localCats) setCategories(updateCommonRecommendations(localCats));
          else setCategories(updateCommonRecommendations(INITIAL_DATA));
          
          if (localSets) setLocalSettings({ ...INITIAL_SETTINGS, ...localSets, socialLinks: localSets.socialLinks || INITIAL_SETTINGS.socialLinks });
          if (localEngines && Array.isArray(localEngines) && localEngines.length > 0) setSearchEngines(localEngines);
          addLog('info', '本地数据加载完成');
      } catch (e) { console.error(e); }

      // Step 2: Verify cloud connection and sync if available
      const isConnected = await verifyCloudConnection();
      if (isConnected) {
        setCloudSyncStatus('connected');
        addLog('info', '云同步服务已连接');
        try {
          const [c, s, e] = await Promise.all([syncCategoriesFromCloud(), syncSettingsFromCloud(), syncSearchEnginesFromCloud()]);
          if (c) { setCategories(updateCommonRecommendations(c)); addLog('info', '云端同步成功'); }
          if (s) setLocalSettings(p => ({...p, ...s, socialLinks: s.socialLinks || p.socialLinks}));
          if (e && Array.isArray(e) && e.length > 0) setSearchEngines(e);
        } catch (err) {
            addLog('error', `云同步获取数据失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        setCloudSyncStatus('disconnected');
        addLog('warn', '未配置或无法连接云同步服务');
      }
    };
    init();
    
    // Step 3: Fetch non-critical dynamic data
    setDateInfo(getFormattedDate());
    const fetchWeatherData = () => {
        if (!navigator.geolocation) {
            setWeatherInfo('error');
            addLog('warn', '浏览器不支持地理位置');
            return;
        }
        setWeatherInfo('loading');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
                    if (!res.ok) throw new Error('天气服务响应失败');
                    const data = await res.json();
                    const { temperature_2m, weather_code } = data.current;
                    const weather = mapWeatherCode(weather_code);
                    setWeatherInfo({
                        icon: weather.icon,
                        text: `${weather.text} ${Math.round(temperature_2m)}°C`
                    });
                    addLog('info', '天气数据获取成功');
                } catch (error) {
                    setWeatherInfo('error');
                    addLog('error', `天气获取失败: ${error instanceof Error ? error.message : String(error)}`);
                }
            },
            (error) => {
                setWeatherInfo('error');
                addLog('error', `地理位置获取失败: ${error.message}`);
            }
        );
    };
    fetchWeatherData();
  }, []);

  useEffect(() => { const t = setInterval(() => {
      setClock(new Date());
      const h = new Date().getHours();
      setGreetingTime(h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上');
  }, 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
      document.title = `${settings.appName} | 个人导航`;
      const updateFavicon = () => {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
          if (settings.logoMode === 'image' && settings.customLogoUrl) {
              link.href = settings.customLogoUrl;
          } else {
              const iconName = settings.appIcon || 'Zap';
              const kebabIcon = iconName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
              link.href = `https://unpkg.com/lucide-static@latest/icons/${kebabIcon}.svg`;
          }
      };
      updateFavicon();
  }, [settings.appName, settings.appIcon, settings.logoMode, settings.customLogoUrl]);

  // -- Theme Logic --
  useEffect(() => {
    const root = window.document.documentElement;
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark);
    
    if (shouldBeDark) {
        root.classList.add('dark');
        setIsDark(true);
    } else {
        root.classList.remove('dark');
        setIsDark(false);
    }
  }, [settings.theme]);

  const toggleTheme = () => {
      const newTheme: AppSettings['theme'] = isDark ? 'light' : 'dark';
      const n = { ...settings, theme: newTheme };
      setLocalSettings(n);
      saveSettings(n);
      addToast('info', `切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`);
  };

  useEffect(() => { 
    if (editingAiConfig) { 
        setAiKeySource(editingAiConfig.envSlot ? 'env' : 'manual'); 
        setTestStatus({ status: 'idle' }); 
    } 
  }, [editingAiConfig?.id]);

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

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, catId: string, index: number) => {
      setDraggedItem({ catId, index });
      e.dataTransfer.effectAllowed = "move";
      // Firefox requires setData to be set for drag to work properly
      e.dataTransfer.setData("text/plain", `${catId}:${index}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetCatId: string, targetIndex: number) => {
      e.preventDefault();
      if (!draggedItem) return;
      
      // If dropping onto self, do nothing
      if (draggedItem.catId === targetCatId && draggedItem.index === targetIndex) {
          setDraggedItem(null);
          return;
      }

      const newCats = [...categories];
      
      const sourceCatIndex = newCats.findIndex(c => c.id === draggedItem.catId);
      const targetCatIndex = newCats.findIndex(c => c.id === targetCatId);
      
      if (sourceCatIndex === -1 || targetCatIndex === -1) {
          setDraggedItem(null);
          return;
      }

      // Clone links arrays
      const sourceLinks = [...newCats[sourceCatIndex].links];
      const targetLinks = sourceCatIndex === targetCatIndex ? sourceLinks : [...newCats[targetCatIndex].links];
      
      // Remove from source
      const [movedItem] = sourceLinks.splice(draggedItem.index, 1);
      
      // Insert into target
      targetLinks.splice(targetIndex, 0, movedItem);
      
      // Update categories structure
      newCats[sourceCatIndex].links = sourceLinks;
      if (sourceCatIndex !== targetCatIndex) {
          newCats[targetCatIndex].links = targetLinks;
      }
      
      handleSaveData(newCats);
      setDraggedItem(null);
  };

  const handleSaveData = async (newCats: Category[]) => {
      const updated = updateCommonRecommendations(newCats);
      setCategories(updated);
      await saveCategories(updated);
  };
  
  const handleLinkClick = async (category: Category, link: LinkItem) => {
      setClickedLinkId(link.id); 
      setTimeout(() => setClickedLinkId(null), 350); 
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
          setIsAuthenticated(true); localStorage.setItem('aurora_auth', 'true'); 
          setShowLoginModal(false); setIsEditMode(true); 
          setLoginError(''); setPasswordInput(''); addToast('success', '管理员登录成功'); 
      } else { setLoginError('密码错误'); } 
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg' | 'qr') => { 
      const file = e.target.files?.[0]; 
      if (!file) return; 
      if (file.size > 2 * 1024 * 1024) { addToast('error', '文件大小不能超过 2MB'); return; } 
      const reader = new FileReader(); 
      reader.onloadend = () => { 
          const result = reader.result as string; 
          if (type === 'qr') {
              setSocialForm(prev => ({...prev, qrCode: result}));
              addToast('success', 'QR 二维码上传成功');
              return;
          }
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
          addToast('success', `${type === 'logo' ? 'Logo' : '背景'} 图片已更新`); 
      }; 
      reader.readAsDataURL(file); 
  };
  
  const handleAiSuggestIcon = async () => {
      const seedText = (settings.appIcon && settings.appIcon.trim() !== '' && settings.appIcon !== 'Zap') ? settings.appIcon : settings.appName;
      if (!seedText) return;
      setIsIconSuggesting(true);
      try {
          const icon = await suggestIcon(seedText);
          const n = {...settings, appIcon: icon};
          setLocalSettings(n);
          saveSettings(n);
          addToast('success', `AI 推荐图标: ${icon}`);
      } catch {
          addToast('error', 'AI 推荐图标失败');
      } finally {
          setIsIconSuggesting(false);
      }
  };

  const handleCreateCategory = async () => {
      if (!newCatName.trim()) return;
      setIsCreatingCat(true);
      try {
          // Attempt to get an icon from AI, fallback to 'Folder' handled by service or catch
          const iconName = await suggestIcon(newCatName);
          const newCat: Category = {
              id: `cat-${Date.now()}`,
              title: newCatName,
              icon: iconName,
              links: []
          };
          handleSaveData([...categories, newCat]);
          setShowAddCatModal(false);
          setNewCatName('');
          addToast('success', `分类 "${newCatName}" 创建成功`);
      } catch (e) {
          // Fallback if AI fails completely
          handleSaveData([...categories, { id: `cat-${Date.now()}`, title: newCatName, icon: 'Folder', links: [] }]);
          setShowAddCatModal(false);
          setNewCatName('');
      } finally {
          setIsCreatingCat(false);
      }
  };

  const handleAddAiProvider = () => { const newConfig: AIProviderConfig = { id: `ai-${Date.now()}`, name: '新模型', type: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-3.5-turbo', isActive: false }; const newConfigs = [...settings.aiConfigs, newConfig]; const newSettings = { ...settings, aiConfigs: newConfigs }; setLocalSettings(newSettings); saveSettings(newSettings); setEditingAiConfig(newConfig); };
  
  const handleTestConnection = async (config: AIProviderConfig) => { 
      setTestStatus({ status: 'loading' }); 
      const result = await testAiConnection(config); 
      setTestStatus({ status: result.success ? 'success' : 'fail', message: result.message }); 
      addToast(result.success ? 'success' : 'error', result.message);
  };
  
  const handleDeleteAiProvider = (id: string) => { if (!confirm('确定删除此 AI 配置吗？')) return; const newConfigs = settings.aiConfigs.filter(c => c.id !== id); const newSettings = { ...settings, aiConfigs: newConfigs }; setLocalSettings(newSettings); saveSettings(newSettings); setEditingAiConfig(null); };

  const handleGenerateCategoryLinks = async () => { 
      if (!showGenLinksModal) return; 
      setIsGeneratingLinks(true); 
      try { 
          const allExistingUrls = new Set<string>(); 
          categories.forEach(cat => cat.links.forEach(link => allExistingUrls.add(link.url.toLowerCase().replace(/\/$/, "")))); 
          const existingInCat = categories.find(c => c.id === showGenLinksModal.catId)?.links.map(l => l.url) || []; 
          const newLinks = await generateCategoryLinks(genTopic || showGenLinksModal.title, genCount, existingInCat); 
          const validLinks: LinkItem[] = []; 
          for (const l of newLinks) { 
              if (!l.url || !l.title) continue; 
              const normalizedUrl = l.url.toLowerCase().replace(/\/$/, ""); 
              if (allExistingUrls.has(normalizedUrl)) continue; 
              validLinks.push({ 
                  id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                  title: l.title, url: l.url, description: l.description || '', color: l.color || '#666', clickCount: 0, pros: l.pros, cons: l.cons 
              }); 
              allExistingUrls.add(normalizedUrl); 
          } 
          if (validLinks.length === 0) { addToast('error', "AI 未返回有效结果，请检查 API 配置或更换主题"); return; }
          let newCats = categories.map(cat => cat.id !== showGenLinksModal.catId ? cat : { ...cat, links: [...cat.links, ...validLinks] }); 
          handleSaveData(newCats); setShowGenLinksModal(null); addToast('success', `成功添加了 ${validLinks.length} 个链接`); 
      } catch (e: any) { addToast('error', `生成失败: ${e.message}`); addLog('error', `Generation failed: ${e.message}`);
      } finally { setIsGeneratingLinks(false); } 
  };

  const handleAiFillLink = async () => { 
      if (!linkForm.url) return; 
      setIsAiLoading(true); 
      try { 
          const result = await analyzeUrl(linkForm.url); 
          setLinkForm(prev => ({ ...prev, title: result.title, description: result.description, pros: result.pros, cons: result.cons, color: result.brandColor })); 
          addToast('success', 'AI 链接分析完成'); 
      } catch (e: any) { addToast('error', 'AI 分析失败: ' + e.message); 
      } finally { setIsAiLoading(false); } 
  };

  const handleSaveLink = async () => { 
      if (!editingLink || !linkForm.title || !linkForm.url) return; 
      await isFaviconValid(linkForm.url); 
      const newLink: LinkItem = { 
          id: linkForm.id || `l-${Date.now()}`, 
          title: linkForm.title, url: linkForm.url.startsWith('http') ? linkForm.url : `https://${linkForm.url}`, description: linkForm.description || '', color: linkForm.color || '#666', clickCount: linkForm.clickCount || 0, pros: linkForm.pros, cons: linkForm.cons 
      }; 
      let newCats = categories.map(cat => { 
          if (cat.id !== editingLink.catId) return cat; 
          return editingLink.link ? { ...cat, links: cat.links.map(l => l.id === editingLink.link!.id ? newLink : l) } : { ...cat, links: [...cat.links, newLink] }; 
      }); 
      handleSaveData(newCats); setEditingLink(null); setLinkForm({}); addToast('success', `链接已保存: ${newLink.title}`); 
  };
  
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

  // --- Ai Panel Handlers ---
  const handleAiRefreshGreeting = async () => {
      const text = await getAiGreeting();
      if (text) {
          localStorage.setItem('aurora_greeting_v7', JSON.stringify({ text, expiry: Date.now() + 14400000 }));
      }
      return text;
  };

  const handleAiDiscovery = async (topic: string) => {
      // Use existing link generation logic
      const allExistingUrls = new Set<string>();
      categories.forEach(cat => cat.links.forEach(link => allExistingUrls.add(link.url.toLowerCase().replace(/\/$/, ""))));
      
      const newLinks = await generateCategoryLinks(topic, 3, Array.from(allExistingUrls));
      return newLinks.filter(l => l.title && l.url);
  };

  const handleAddDiscoveryLink = (link: Partial<LinkItem>) => {
      if (!link.title || !link.url) return;
      
      // Determine target category: either current focused one, or Common/First one
      const targetCatId = viewCategory || (categories.length > 0 ? categories[0].id : null);
      if (!targetCatId) return;

      const newLink: LinkItem = {
          id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: link.title,
          url: link.url,
          description: link.description || '',
          color: link.color || '#666',
          pros: link.pros,
          cons: link.cons,
          clickCount: 0
      };

      const newCats = categories.map(cat => {
          if (cat.id !== targetCatId) return cat;
          // If it's Common Recs (which shouldn't happen usually as viewCategory logic handles it), warn user? 
          // Actually logic says: updateCommonRecs recalculates Common. So we should add to a REAL category.
          // If target is Common, find the first real category.
          if (cat.id === COMMON_REC_ID) return cat; 
          return { ...cat, links: [...cat.links, newLink] };
      });
      
      // If target was Common (rec-1), we actually didn't add it above.
      // Let's force add to the first non-common category if viewCategory was null or common.
      let finalCats = newCats;
      if (targetCatId === COMMON_REC_ID) {
           const firstReal = categories.find(c => c.id !== COMMON_REC_ID);
           if (firstReal) {
               finalCats = categories.map(c => c.id === firstReal.id ? { ...c, links: [...c.links, newLink] } : c);
               addToast('success', `已添加到分类: ${firstReal.title}`);
           }
      } else {
           const catName = categories.find(c => c.id === targetCatId)?.title;
           addToast('success', `已添加到分类: ${catName}`);
      }

      handleSaveData(finalCats);
  };


  // --- Render Sections ---
  const renderSidebar = () => (
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50 text-slate-100">
          <div className="p-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white"><Settings size={18}/></div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">管理后台</h1>
              <button onClick={() => {setIsEditMode(false); addToast('info','返回主页')}} className="ml-auto p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Power size={20}/></button>
          </div>
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
              {[{ id: 'dashboard', label: '仪表盘 / 链接', icon: LayoutGrid }, { id: 'general', label: '基础设置', icon: Settings }, { id: 'ai', label: 'AI 服务', icon: Bot }, { id: 'appearance', label: '外观效果', icon: Palette }, { id: 'search', label: '搜索引擎', icon: Search }, { id: 'diagnose', label: '系统日志', icon: Terminal }].map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id as SidebarTab)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm", activeTab === item.id ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
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
                      {
                          cloudSyncStatus === 'connected' ? "已连接云同步" :
                          cloudSyncStatus === 'disconnected' ? "未连接数据库" :
                          "检查连接中..."
                      }
                  </span>
              </div>
              <button onClick={() => { setIsAuthenticated(false); localStorage.removeItem('aurora_auth'); setIsEditMode(false); }} className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2 text-sm font-bold"><LogOut size={16}/> 退出登录</button>
          </div>
      </aside>
  );

  const renderDashboardContent = () => (
      <div className="space-y-8 animate-fade-in text-slate-100">
          {categories.map((category, idx) => (
              <div key={category.id} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-900/20 rounded-lg text-cyan-400"><Icon name={category.icon} size={20}/></div>
                          <input value={category.title} onChange={(e) => { const n = [...categories]; n[idx].title = e.target.value; setCategories(n); }} className="text-lg font-bold bg-transparent outline-none border-b border-transparent focus:border-cyan-500 w-40 text-slate-100"/>
                      </div>
                      {category.id !== COMMON_REC_ID && (
                          <div className="flex items-center gap-2">
                              <button onClick={() => { setShowGenLinksModal({catId: category.id, title: category.title}); setGenTopic(category.title); }} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-900/30 text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-900/50 transition-colors border border-cyan-500/20"><Wand2 size={14}/> AI 填充</button>
                              <button onClick={() => { const n = [...categories]; [n[idx], n[idx-1]] = [n[idx-1], n[idx]]; handleSaveData(n); }} disabled={idx <= 1} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded disabled:opacity-30"><ChevronUp size={16}/></button>
                              <button onClick={() => { const n = [...categories]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; handleSaveData(n); }} disabled={idx === categories.length-1} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded disabled:opacity-30"><ChevronDown size={16}/></button>
                              <button onClick={() => setConfirmModal({ isOpen: true, message: `确定要删除分类 "${category.title}" 吗？`, onConfirm: () => { const n = categories.filter(c => c.id !== category.id); handleSaveData(n); setConfirmModal(null); addToast('success', '分类已删除'); } })} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded"><Trash2 size={16}/></button>
                          </div>
                      )}
                  </div>
                  <div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (category.id !== COMMON_REC_ID && draggedItem) {
                            handleDrop(e, category.id, category.links.length);
                        }
                    }}
                  >
                      {category.links.map((link, linkIndex) => (
                          <div 
                            key={link.id} 
                            draggable={category.id !== COMMON_REC_ID}
                            onDragStart={(e) => handleDragStart(e, category.id, linkIndex)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => {
                                e.stopPropagation(); // Prevent bubble to grid
                                handleDrop(e, category.id, linkIndex);
                            }}
                            className={cn(
                                "group relative p-4 rounded-xl border flex items-start gap-3 bg-slate-950 border-slate-800 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-900/10 transition-all cursor-move",
                                draggedItem?.catId === category.id && draggedItem?.index === linkIndex ? "opacity-30 border-dashed border-cyan-500" : ""
                            )}
                          >
                              <Favicon url={link.url} size={32} className="rounded-lg shadow-sm" onLoadError={() => setBrokenLinks(p => new Set(p).add(link.id))}/>
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate text-slate-200">{link.title}</div>
                                  <div className="text-xs text-slate-500 truncate mt-0.5">{link.description}</div>
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-1 rounded border border-slate-800 shadow-sm">
                                  <button onClick={() => { setEditingLink({catId: category.id, link}); setLinkForm({...link}); }} className="p-1 text-cyan-400 hover:bg-cyan-900/30 rounded"><Edit size={12}/></button>
                                  <button onClick={() => { const n = categories.map(c => c.id===category.id?{...c, links: c.links.filter(l=>l.id!==link.id)}:c); handleSaveData(n); }} className="p-1 text-red-400 hover:bg-red-900/30 rounded"><Trash2 size={12}/></button>
                              </div>
                          </div>
                      ))}
                      {category.id !== COMMON_REC_ID && <button onClick={() => { setEditingLink({ catId: category.id }); setLinkForm({ color: '#666666' }); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-950/20 transition-all min-h-[80px]"><Plus size={20}/><span className="text-xs font-bold">添加链接</span></button>}
                  </div>
              </div>
          ))}
          <button onClick={() => setShowAddCatModal(true)} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 font-bold hover:border-cyan-500 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"><Plus size={20}/> 添加新分类</button>
      </div>
  );

  const renderGeneralSettings = () => (
      <div className="space-y-8 animate-fade-in text-slate-100">
          <section className="bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-slate-800">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Settings className="text-cyan-400"/> 基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-bold text-slate-400 mb-2">应用名称</label><input value={settings.appName} onChange={(e) => { const n = {...settings, appName: e.target.value}; setLocalSettings(n); saveSettings(n); }} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 transition-colors text-slate-200"/></div>
                  <div><label className="block text-sm font-bold text-slate-400 mb-2">Logo 模式</label><div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">{(['icon', 'image'] as const).map(m => (<button key={m} onClick={() => { const n = {...settings, logoMode: m}; setLocalSettings(n); saveSettings(n); }} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", settings.logoMode === m ? "bg-slate-800 shadow-sm text-cyan-400" : "text-slate-500 hover:text-slate-300")}>{m === 'icon' ? '图标' : '图片'}</button>))}</div></div>
                  {settings.logoMode === 'icon' ? (<div><label className="block text-sm font-bold text-slate-400 mb-2">图标名称 (Lucide React)</label><div className="flex gap-2"><div className="w-12 h-12 rounded-xl bg-cyan-900/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20"><Icon name={settings.appIcon} size={24}/></div><div className="flex-1 flex gap-2"><input value={settings.appIcon} onChange={(e) => { const n = {...settings, appIcon: e.target.value}; setLocalSettings(n); saveSettings(n); }} className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 transition-colors font-mono text-slate-200"/><button onClick={handleAiSuggestIcon} disabled={isIconSuggesting} className="px-4 bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded-xl font-bold hover:bg-cyan-900/50 transition-colors flex items-center gap-2 text-xs">{isIconSuggesting ? <LoadingSpinner/> : <Sparkles size={16}/>} 智能推荐</button></div></div></div>) : (<div><label className="block text-sm font-bold text-slate-400 mb-2">上传 Logo</label><div className="flex items-center gap-2">{settings.customLogoUrl && <img src={settings.customLogoUrl} className="w-12 h-12 rounded-xl object-contain bg-slate-950"/>}<input placeholder="https://..." value={settings.customLogoUrl || ''} onChange={(e) => { const n = {...settings, customLogoUrl: e.target.value}; setLocalSettings(n); saveSettings(n); }} className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-sm text-slate-200"/><label className="cursor-pointer px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 text-slate-300"><Upload size={16}/> 上传<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')}/></label></div></div>)}
                  
                  {/* Password Status Check - New Feature */}
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">管理员密码状态</label>
                    <div className={cn("p-3 rounded-xl border flex items-center gap-3", process.env.ADMIN_PASSWORD ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" : "bg-red-950/20 border-red-500/20 text-red-400")}>
                        {process.env.ADMIN_PASSWORD ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                        <span className="text-sm font-medium">
                            {process.env.ADMIN_PASSWORD ? "已配置 (安全)" : "未检测到 (危险) - 请在部署平台配置环境变量并重新部署"}
                        </span>
                    </div>
                  </div>

              </div>
          </section>
      </div>
  );

  const renderAiSettings = () => (
      <div className="space-y-6 animate-fade-in text-slate-100">
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Bot className="text-cyan-400"/> AI 模型服务</h3>
                  <button onClick={handleAddAiProvider} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm flex items-center gap-2"><Plus size={16}/> 添加模型</button>
              </div>
              <div className="grid gap-4">
                  {settings.aiConfigs.map(config => (
                      <div key={config.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4 group hover:border-cyan-500/30 transition-all">
                          <div className={cn("p-3 rounded-lg", config.isActive ? "bg-cyan-900/20 text-cyan-400" : "bg-slate-900 text-slate-500")}><Server size={20}/></div>
                          <div className="flex-1">
                              <div className="font-bold text-slate-200 flex items-center gap-2">
                                  {config.name}
                                  {config.isActive && <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-900/30 text-cyan-400 border border-cyan-500/20">已激活</span>}
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-1">{config.type === 'google' ? 'Google Gemini SDK' : 'OpenAI 兼容'} • {config.model}</div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingAiConfig(config)} className="p-2 text-cyan-400 hover:bg-cyan-900/20 rounded-lg"><Edit size={16}/></button>
                              <button onClick={() => handleDeleteAiProvider(config.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Sparkles className="text-purple-400"/> AI 每日寄语</h3>
               <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                   <div>
                       <div className="font-bold text-slate-200">启用 AI 欢迎语</div>
                       <div className="text-xs text-slate-500">每天首次访问时展示一句 AI 生成的哲学寄语</div>
                   </div>
                   <button onClick={() => { const n = {...settings, enableAiGreeting: !settings.enableAiGreeting}; setLocalSettings(n); saveSettings(n); }} className={cn("w-12 h-6 rounded-full transition-colors relative", settings.enableAiGreeting ? "bg-cyan-600" : "bg-slate-700")}>
                       <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", settings.enableAiGreeting ? "left-7" : "left-1")}/>
                   </button>
               </div>
          </div>
      </div>
  );

  const renderAppearanceSettings = () => (
      <div className="space-y-6 animate-fade-in text-slate-100">
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><Palette className="text-pink-400"/> 主题风格</h3>
              
              <div>
                  <label className="block text-sm font-bold text-slate-400 mb-3">背景模式</label>
                  <div className="grid grid-cols-3 gap-3">
                      {[
                          {id: 'aurora', label: '极光', icon: Sparkles},
                          {id: 'monotone', label: '纯色', icon: Moon},
                          {id: 'custom', label: '自定义', icon: ImageIcon}
                      ].map(m => (
                          <button key={m.id} onClick={() => { const n = {...settings, backgroundMode: m.id as any}; setLocalSettings(n); saveSettings(n); }} className={cn("p-4 rounded-xl border flex flex-col items-center gap-2 transition-all", settings.backgroundMode === m.id ? "bg-cyan-900/20 border-cyan-500 text-cyan-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600")}>
                              <m.icon size={24}/>
                              <span className="text-xs font-bold">{m.label}</span>
                          </button>
                      ))}
                  </div>
              </div>

              {settings.backgroundMode === 'custom' && (
                  <div className="animate-fade-in-up">
                      <label className="block text-sm font-bold text-slate-400 mb-2">背景图片</label>
                      <div className="flex items-center gap-4">
                          {settings.customBackgroundImage && <div className="w-20 h-20 rounded-xl bg-cover bg-center border border-slate-700 shadow-sm" style={{backgroundImage: `url(${settings.customBackgroundImage})`}}/>}
                          <label className="flex-1 cursor-pointer h-20 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-cyan-500 hover:text-cyan-400 transition-colors bg-slate-950">
                              <Upload size={20}/>
                              <span className="text-xs font-bold mt-1">上传图片 (最多 2MB)</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'bg')}/></label>
                      </div>
                  </div>
              )}

              <div>
                   <div className="flex justify-between mb-2">
                       <label className="text-sm font-bold text-slate-400">卡片透明度</label>
                       <span className="text-xs font-mono text-cyan-400">{settings.cardOpacity}%</span>
                   </div>
                   <input type="range" min="20" max="100" value={settings.cardOpacity} onChange={(e) => { const n = {...settings, cardOpacity: parseInt(e.target.value)}; setLocalSettings(n); saveSettings(n); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
              </div>
              
              <div>
                   <div className="flex justify-between mb-2">
                       <label className="text-sm font-bold text-slate-400">背景模糊度</label>
                       <span className="text-xs font-mono text-cyan-400">{settings.backgroundBlur || 0}px</span>
                   </div>
                   <input type="range" min="0" max="20" value={settings.backgroundBlur || 0} onChange={(e) => { const n = {...settings, backgroundBlur: parseInt(e.target.value)}; setLocalSettings(n); saveSettings(n); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
              </div>
          </div>
      </div>
  );

  const renderSearchSettings = () => (
      <div className="space-y-6 animate-fade-in text-slate-100">
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Search className="text-blue-400"/> 搜索引擎管理</h3>
              
              <div className="space-y-4 mb-6">
                  {searchEngines.map((engine) => (
                      <div key={engine.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/30 transition-all group">
                           <Favicon url={engine.baseUrl} size={24} className="rounded-full"/>
                           <div className="flex-1">
                               <div className="font-bold text-slate-200">{engine.name}</div>
                               <div className="text-xs text-slate-500 font-mono truncate max-w-[300px]">{engine.searchUrlPattern}</div>
                           </div>
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => { const n = {...settings, activeSearchEngineId: engine.id}; setLocalSettings(n); saveSettings(n); }} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", settings.activeSearchEngineId === engine.id ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
                                   {settings.activeSearchEngineId === engine.id ? "默认" : "设为默认"}
                               </button>
                               <button onClick={() => { if(confirm('删除此搜索引擎?')) { const n = searchEngines.filter(e => e.id !== engine.id); setSearchEngines(n); saveSearchEngines(n); } }} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={16}/></button>
                           </div>
                      </div>
                  ))}
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><Plus size={16}/> 添加搜索引擎</h4>
                  <div className="space-y-3">
                      <div className="flex gap-2">
                          <input placeholder="网址 (例如 google.com)" value={engineForm.baseUrl || ''} onChange={(e) => { setEngineForm({...engineForm, baseUrl: e.target.value}); autoFillSearchEngine(e.target.value); }} className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-cyan-500 text-slate-200 text-sm"/>
                          <input placeholder="名称" value={engineForm.name || ''} onChange={(e) => setEngineForm({...engineForm, name: e.target.value})} className="w-1/3 p-3 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-cyan-500 text-slate-200 text-sm"/>
                      </div>
                      <input placeholder="搜索 URL 模式 (例如 https://google.com/search?q=)" value={engineForm.searchUrlPattern || ''} onChange={(e) => setEngineForm({...engineForm, searchUrlPattern: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-cyan-500 text-slate-200 text-sm font-mono"/>
                      <button onClick={() => { if(!engineForm.name || !engineForm.searchUrlPattern) return; const newEngine: SearchEngine = { id: `se-${Date.now()}`, name: engineForm.name, baseUrl: engineForm.baseUrl || '', searchUrlPattern: engineForm.searchUrlPattern }; const n = [...searchEngines, newEngine]; setSearchEngines(n); saveSearchEngines(n); setEngineForm({}); addToast('success', '搜索引擎已添加'); }} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors">添加</button>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderLogs = () => (
      <div className="space-y-6 animate-fade-in text-slate-100">
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 h-[calc(100vh-200px)] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Terminal className="text-orange-400"/> 系统日志</h3>
                  <button onClick={clearLogs} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 size={14}/> 清空</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs space-y-2">
                  {logs.length === 0 && <div className="text-slate-600 text-center py-10">暂无日志</div>}
                  {logs.map(log => (
                      <div key={log.id} className="flex gap-3 border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                          <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                          <span className={cn("uppercase font-bold shrink-0 w-12", log.level === 'error' ? "text-red-500" : log.level === 'warn' ? "text-yellow-500" : "text-cyan-500")}>{log.level}</span>
                          <span className="text-slate-300 break-all">{log.message}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderViewMode = () => {
    const activeEngine = searchEngines?.find(e => e.id === settings.activeSearchEngineId) 
        || searchEngines?.[0] 
        || { id: 'fallback', name: 'Google', baseUrl: 'https://google.com', searchUrlPattern: 'https://google.com/search?q=' };

    const visibleCategories = viewCategory 
        ? categories.filter(c => c.id === viewCategory)
        : categories;

    // Enhanced Aurora Gradients for both Light and Dark modes
    const deepAuroraGradient = settings.backgroundMode === 'aurora' ? (
        <div className="fixed inset-0 overflow-hidden -z-20 pointer-events-none select-none transition-colors duration-1000 ease-in-out bg-slate-50 dark:bg-[#020617]">
            {/* Dark Mode Orbs */}
            <div className="hidden dark:block">
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-900/30 rounded-full blur-[120px] animate-float opacity-60"/>
                <div className="absolute top-[10%] right-[-20%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[120px] animate-float opacity-50" style={{ animationDelay: '2s' }}/>
                <div className="absolute bottom-[-10%] left-[20%] w-[70vw] h-[70vw] bg-cyan-900/10 rounded-full blur-[150px] animate-float opacity-40" style={{ animationDelay: '4s' }}/>
            </div>
            
            {/* Light Mode Orbs (Softer, Pastel) */}
            <div className="block dark:hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-blue-100/80 rounded-full blur-[100px] animate-float opacity-60"/>
                <div className="absolute top-[10%] right-[-20%] w-[60vw] h-[60vw] bg-purple-100/60 rounded-full blur-[100px] animate-float opacity-50" style={{ animationDelay: '2s' }}/>
                <div className="absolute bottom-[-10%] left-[10%] w-[80vw] h-[80vw] bg-cyan-100/60 rounded-full blur-[120px] animate-float opacity-40" style={{ animationDelay: '4s' }}/>
            </div>

            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>
    ) : null;

    return (
      <div className={cn("min-h-screen font-sans transition-colors duration-500 ease-out selection:bg-cyan-500/30 text-slate-900 dark:text-slate-100", 
          settings.backgroundMode === 'monotone' ? "bg-slate-50 dark:bg-slate-950" : "bg-transparent")}>
          
          {settings.backgroundMode === 'custom' && settings.customBackgroundImage && (
              <div className="fixed inset-0 bg-cover bg-center -z-20 transition-opacity duration-700" style={{ backgroundImage: `url(${settings.customBackgroundImage})` }} />
          )}
          {deepAuroraGradient}
          {/* Main Backdrop: Lighter for Light Mode, Darker for Dark Mode */}
          <div className="fixed inset-0 bg-white/30 dark:bg-slate-950/20 -z-10 backdrop-blur-[1px]" />

          <header className="fixed top-0 left-0 right-0 z-40 px-6 lg:px-12 py-5 flex items-center justify-between bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 shadow-sm transition-all duration-300">
             <div className="flex items-center gap-6">
                 <div className="hidden md:flex items-center gap-3">
                     {settings.logoMode === 'icon' ? (
                         <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
                             <Icon name={settings.appIcon} size={20}/>
                         </div>
                     ) : (
                         settings.customLogoUrl && <img src={settings.customLogoUrl} className="w-10 h-10 rounded-2xl object-contain bg-white/10 shadow-sm"/>
                     )}
                     <div className="flex flex-col">
                         <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{settings.appName}</h1>
                         <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)] dark:shadow-[0_0_10px_rgba(34,211,238,0.5)]"/> 
                             在线
                         </p>
                     </div>
                 </div>
                 <button className="md:hidden p-2 text-slate-600 dark:text-slate-400"><Menu size={20}/></button>
             </div>

             <div className="flex-1 max-w-xl mx-4 relative group">
                 <div className="absolute inset-y-0 left-4 flex items-center gap-3 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">
                     <Search size={18}/>
                 </div>
                 <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && searchTerm.trim()) window.open(activeEngine.searchUrlPattern + encodeURIComponent(searchTerm), settings.openInNewTab ? '_blank' : '_self'); }} 
                    className="w-full h-11 pl-12 pr-4 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 focus:bg-white dark:focus:bg-slate-900/80 focus:border-cyan-500/30 dark:focus:border-cyan-500/50 shadow-inner focus:shadow-lg focus:shadow-cyan-500/10 outline-none text-sm font-medium transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 backdrop-blur-md" 
                    placeholder={`使用 ${activeEngine?.name} 搜索...`}
                 />
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-1">
                    {(searchEngines || []).slice(0, 3).map(engine => (
                        <button key={engine.id} onClick={() => { const n = {...settings, activeSearchEngineId: engine.id}; setLocalSettings(n); saveSettings(n); }} className={cn("p-1.5 rounded-lg transition-all", settings.activeSearchEngineId === engine.id ? "bg-white dark:bg-cyan-500/20 shadow-sm text-cyan-600 dark:text-cyan-300 opacity-100 scale-110 border border-slate-200 dark:border-cyan-500/30" : "opacity-40 hover:opacity-80 hover:bg-white/50 dark:hover:bg-white/10 text-slate-400")}>
                            <Favicon url={engine.baseUrl} size={14} className="rounded-full grayscale hover:grayscale-0 transition-all"/>
                        </button>
                    ))}
                 </div>
             </div>

             <div className="flex items-center gap-2">
                 <button onClick={toggleTheme} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-amber-500 dark:hover:text-yellow-300 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                     {isDark ? <Sun size={20}/> : <Moon size={20}/>}
                 </button>
                 <button onClick={() => isAuthenticated ? setIsEditMode(true) : setShowLoginModal(true)} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                     <Settings size={20}/>
                 </button>
             </div>
          </header>

          <div className="pt-28 px-4 lg:px-12 max-w-[1600px] mx-auto flex gap-12 h-screen">
              <aside className="hidden lg:flex w-64 shrink-0 flex-col pb-10 sticky top-28 h-[calc(100vh-140px)]">
                  <div className="mb-8 p-6 rounded-3xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/5 shadow-xl dark:shadow-lg relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 dark:from-cyan-500/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex flex-col items-center justify-center text-center">
                        {/* Time Display */}
                        <div className="flex items-baseline">
                          <div className="text-5xl font-bold text-slate-800 dark:text-white tracking-tight">
                            {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}
                          </div>
                          <div className="ml-2 text-2xl font-medium text-slate-400">
                            {String(clock.getSeconds()).padStart(2, '0')}
                          </div>
                        </div>

                        {/* Greeting Text */}
                        <div className="mt-4 text-lg font-medium text-cyan-600 dark:text-cyan-400">
                          {greetingTime}好
                        </div>

                        {/* Date and Weather Info */}
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
                          <span>总览</span>
                          {!viewCategory && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"/>}
                      </button>

                      <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent opacity-50"/>

                      {(categories || []).map(cat => (
                          <button key={cat.id} onClick={() => setViewCategory(cat.id)} className={cn("w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all text-sm font-medium group relative", 
                              viewCategory === cat.id 
                                ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-md backdrop-blur-md border border-slate-100 dark:border-white/5" 
                                : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                          )}>
                              <div className={cn("transition-transform group-hover:scale-110 duration-200", viewCategory === cat.id ? "text-cyan-600 dark:text-cyan-400" : cat.id === COMMON_REC_ID ? "text-orange-500 dark:text-orange-400" : "text-slate-400 dark:text-slate-500")}><Icon name={cat.icon} size={18}/></div>
                              <span>{cat.title}</span>
                          </button>
                      ))}
                  </nav>
                  
                  <div className="mt-auto pt-6 flex gap-3 flex-wrap">
                      {(settings.socialLinks || []).map(link => (
                         <a key={link.id} href={link.qrCode ? undefined : link.url} onClick={(e) => { if(link.qrCode) { e.preventDefault(); setShowQrModal(link.qrCode); }}} target={link.qrCode ? undefined : "_blank"} className="p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-cyan-900/10 dark:hover:shadow-cyan-900/20 hover:-translate-y-1 transition-all duration-300" title={link.platform}><Icon name={link.icon} size={18}/></a>
                      ))}
                  </div>
              </aside>

              <main className="flex-1 min-w-0 flex flex-col h-[calc(100vh-120px)]">
                  {/* Fixed Header Section (AI Panel or Back Button) */}
                  <div className="shrink-0 z-20 px-2"> 
                      {/* We need some bottom margin/padding here so it doesn't look cramped against the scroll area */}
                      {settings.enableAiGreeting && !viewCategory && (
                          <div className="mb-0"> 
                              <AiCommandPanel 
                                  initialGreeting={aiGreeting}
                                  onRefreshGreeting={handleAiRefreshGreeting}
                                  onAskQuestion={askSimpleQuestion}
                                  onDiscoverSites={handleAiDiscovery}
                                  onAddLink={handleAddDiscoveryLink}
                              />
                          </div>
                      )}
                      
                      {viewCategory && (
                          <div className="mb-8 animate-fade-in">
                              <button onClick={() => setViewCategory(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/10 hover:border-cyan-500/30 hover:text-cyan-600 dark:hover:text-white transition-all group">
                                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> 返回总览
                              </button>
                          </div>
                      )}
                  </div>

                  {/* Scrollable Content Section */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-20 scroll-smooth">
                      <div className="space-y-10 pb-10">
                          {visibleCategories.map(cat => {
                              const isFocusMode = !!viewCategory;
                              const isCommon = cat.id === COMMON_REC_ID;
                              const showAllLinks = isFocusMode || isCommon;
                              const displayLinks = showAllLinks ? cat.links : cat.links.slice(0, 2);
                              const hasMore = !showAllLinks && cat.links.length > 2;

                              return (
                                  <section key={cat.id} id={cat.id} className="scroll-mt-36 animate-fade-in-up">
                                      <div className="flex items-center gap-4 mb-6 group cursor-pointer" onClick={() => !isCommon && !viewCategory && setViewCategory(cat.id)}>
                                          <div className={cn("p-2.5 rounded-xl transition-all duration-300 border border-transparent", 
                                              isCommon 
                                                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" 
                                                : "bg-white/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-hover:bg-cyan-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                                          )}>
                                              <Icon name={cat.icon} size={22}/>
                                          </div>
                                          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{cat.title}</h2>
                                          {!isCommon && !viewCategory && (
                                              <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300 text-cyan-600 dark:text-cyan-400">
                                                  <ChevronRight size={18}/>
                                              </div>
                                          )}
                                      </div>
                                      
                                      <div 
                                          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
                                          onDragOver={handleDragOver}
                                          onDrop={(e) => {
                                              e.preventDefault();
                                              if (!isCommon && draggedItem && draggedItem.catId) {
                                                  // If dropped on empty space in grid, append to end
                                                  handleDrop(e, cat.id, cat.links.length);
                                              }
                                          }}
                                      >
                                          {displayLinks.map((link, linkIndex) => (
                                              <div 
                                                key={link.id} 
                                                draggable={!isCommon}
                                                onDragStart={(e) => handleDragStart(e, cat.id, linkIndex)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => {
                                                    e.stopPropagation();
                                                    handleDrop(e, cat.id, linkIndex);
                                                }}
                                                onClick={() => handleLinkClick(cat, link)} 
                                                className={cn(
                                                    "group relative flex flex-col p-5 rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden ring-1 ring-transparent",
                                                    // Updated Card Styles for Light/Dark
                                                    "bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-white/5 shadow-sm dark:shadow-sm",
                                                    clickedLinkId === link.id 
                                                        ? "animate-pop bg-cyan-500/10 border-cyan-500/30 ring-cyan-500/30" 
                                                        : "hover:shadow-2xl hover:shadow-cyan-900/10 dark:hover:shadow-cyan-900/20 hover:scale-[1.02] hover:-translate-y-1 hover:ring-cyan-500/30 hover:border-cyan-500/30",
                                                    draggedItem?.catId === cat.id && draggedItem?.index === linkIndex && "opacity-40 border-dashed border-cyan-500 scale-95"
                                                )} 
                                                style={{ opacity: (draggedItem?.catId === cat.id && draggedItem?.index === linkIndex) ? 0.4 : settings.cardOpacity / 100 }}
                                              >
                                                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 dark:from-cyan-500/20 dark:to-purple-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"/>
                                                  
                                                  <div className="flex items-start justify-between mb-4 relative z-10">
                                                      <div className="p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-inner group-hover:shadow-cyan-500/20 transition-all border border-slate-100 dark:border-white/5">
                                                          <Favicon url={link.url} size={32} className="rounded-xl"/>
                                                      </div>
                                                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-cyan-500/20 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-all duration-300 scale-90 group-hover:scale-100">
                                                          <ArrowLeft size={16} className="rotate-135"/>
                                                      </div>
                                                  </div>
                                                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-[15px] truncate mb-1 relative z-10 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">{link.title}</h3>
                                                  <p className="text-xs text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 line-clamp-2 leading-relaxed relative z-10 transition-colors">{link.description}</p>
                                                  
                                                  {(link.pros || link.cons) && (
                                                      <div className="mt-4 flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
                                                          {link.pros && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]">{link.pros}</span>}
                                                          {link.cons && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{link.cons}</span>}
                                                      </div>
                                                  )}
                                              </div>
                                          ))}
                                          {hasMore && (
                                              <button onClick={() => setViewCategory(cat.id)} className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white/30 dark:bg-white/[0.02] text-slate-400 dark:text-slate-500 hover:border-cyan-500/30 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/5 transition-all group backdrop-blur-sm min-h-[140px]">
                                                  <div className="w-12 h-12 rounded-full bg-white/50 dark:bg-white/5 group-hover:bg-cyan-500/10 shadow-sm flex items-center justify-center transition-all group-hover:scale-110 duration-300">
                                                      <ChevronRight size={24}/>
                                                  </div>
                                                  <span className="text-xs font-bold tracking-wide">查看全部 ({cat.links.length})</span>
                                              </button>
                                          )}
                                      </div>
                                  </section>
                              );
                          })}
                      </div>
                  </div>
              </main>
          </div>
          <ToastContainer toasts={toasts} remove={(id) => setToasts(p => p.filter(t => t.id !== id))} />
          {showLoginModal && (
              <Modal title="管理员登录" onClose={() => setShowLoginModal(false)} icon={<Lock className="text-cyan-400"/>}>
                  <form onSubmit={handleLogin} className="p-8 flex flex-col gap-6">
                      <div className="text-center"><div className="w-16 h-16 bg-cyan-900/30 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-cyan-500/20"><Lock size={32}/></div><h3 className="text-xl font-bold text-white">验证身份</h3></div>
                      <div className="space-y-2"><input type="password" autoFocus value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="管理员密码" className={cn("w-full p-4 rounded-xl bg-slate-950 border outline-none transition-all text-center text-lg tracking-widest text-white placeholder:text-slate-600", loginError ? "border-red-500/50 bg-red-900/10" : "border-slate-800 focus:border-cyan-500")}/>{loginError && <p className="text-red-400 text-xs text-center font-bold animate-shake">{loginError}</p>}</div>
                      <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-transform active:scale-95">解锁后台</button>
                  </form>
              </Modal>
          )}
          {showQrModal && (<Modal title="扫描二维码" onClose={() => setShowQrModal(null)} icon={<QrCode className="text-emerald-400"/>}><div className="p-8 flex justify-center bg-white rounded-xl"><img src={showQrModal} alt="QR Code" className="max-w-[300px] rounded-lg shadow-lg"/></div></Modal>)}
      </div>
    );
  }

  // --- Main Render Logic ---
  if (isEditMode) {
    return (
      <div className="flex h-screen bg-slate-950 text-slate-100 font-sans transition-colors selection:bg-cyan-500/30">
          {renderSidebar()}
          <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen bg-slate-950/50 custom-scrollbar">
              <div className="max-w-5xl mx-auto pb-20">
                  {activeTab === 'dashboard' && renderDashboardContent()}
                  {activeTab === 'general' && renderGeneralSettings()}
                  {activeTab === 'ai' && renderAiSettings()}
                  {activeTab === 'appearance' && renderAppearanceSettings()}
                  {activeTab === 'search' && renderSearchSettings()}
                  {activeTab === 'diagnose' && renderLogs()}
              </div>
          </main>
          
          <ToastContainer toasts={toasts} remove={(id) => setToasts(p => p.filter(t => t.id !== id))} />
          
          {showAddCatModal && (
                <Modal title="创建新分类" onClose={() => setShowAddCatModal(false)} icon={<Plus className="text-cyan-400"/>}>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">分类名称</label>
                            <input 
                                autoFocus
                                value={newCatName} 
                                onChange={(e) => setNewCatName(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 text-white placeholder:text-slate-600" 
                                placeholder="例如: 电影、设计、阅读..."
                            />
                            <p className="mt-2 text-xs text-slate-500">AI 将根据名称自动匹配合适的图标。</p>
                        </div>
                        <button 
                            onClick={handleCreateCategory} 
                            disabled={isCreatingCat || !newCatName.trim()} 
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreatingCat ? <LoadingSpinner/> : <Wand2 size={18}/>}
                            {isCreatingCat ? '正在匹配图标...' : '创建分类'}
                        </button>
                    </div>
                </Modal>
          )}

          {showGenLinksModal && (
              <Modal title={`AI 生成: ${showGenLinksModal.title}`} onClose={() => setShowGenLinksModal(null)} icon={<Wand2 className="text-cyan-400"/>}>
                   <div className="p-6 space-y-6">
                       <div><label className="block text-sm font-bold text-slate-400 mb-2">生成主题</label><input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 text-white" placeholder="默认使用分类名称..."/></div>
                       <div><label className="block text-sm font-bold text-slate-400 mb-2">生成数量: {genCount}</label><input type="range" min="1" max="10" value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value))} className="w-full accent-cyan-500"/></div>
                       <button onClick={handleGenerateCategoryLinks} disabled={isGeneratingLinks} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{isGeneratingLinks ? <LoadingSpinner/> : <Wand2 size={18}/>}{isGeneratingLinks ? '正在思考中...' : '开始生成'}</button>
                   </div>
              </Modal>
          )}
          
          {editingLink && (
              <Modal title={editingLink.link ? '编辑链接' : '添加链接'} onClose={() => setEditingLink(null)} icon={<LinkIcon className="text-blue-400"/>}>
                  <div className="p-6 space-y-4 text-slate-200">
                       <div className="flex gap-2"><input placeholder="URL (https://...)" value={linkForm.url || ''} onChange={(e) => setLinkForm({...linkForm, url: e.target.value})} className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/><button onClick={handleAiFillLink} disabled={isAiLoading} className="px-4 bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded-xl font-bold hover:bg-cyan-900/50 flex items-center gap-2 text-sm">{isAiLoading ? <LoadingSpinner/> : <Wand2 size={16}/>} 智能识别</button></div>
                       <input placeholder="标题" value={linkForm.title || ''} onChange={(e) => setLinkForm({...linkForm, title: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
                       <input placeholder="描述" value={linkForm.description || ''} onChange={(e) => setLinkForm({...linkForm, description: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
                       <div className="grid grid-cols-2 gap-4"><input placeholder="优点 (短标签)" value={linkForm.pros || ''} onChange={(e) => setLinkForm({...linkForm, pros: e.target.value})} className="p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/><input placeholder="缺点 (短标签)" value={linkForm.cons || ''} onChange={(e) => setLinkForm({...linkForm, cons: e.target.value})} className="p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/></div>
                       <button onClick={handleSaveLink} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500">保存</button>
                  </div>
              </Modal>
          )}
          
          {editingAiConfig && (
              <Modal title={editingAiConfig.id.startsWith('ai-') ? '编辑 AI 模型' : '添加 AI 模型'} onClose={() => setEditingAiConfig(null)} icon={<Bot className="text-cyan-400"/>}>
                  <div className="p-6 space-y-4 text-slate-200">
                      <div><label className="block text-sm font-bold text-slate-400 mb-2">模型名称</label><input value={editingAiConfig.name} onChange={(e) => setEditingAiConfig({...editingAiConfig, name: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/></div>
                      <div>
                          <label className="block text-sm font-bold text-slate-400 mb-2">服务类型</label>
                          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                              {/* Fix: Clear API key config when switching to 'google' to enforce env var usage. */}
                              {(['google', 'openai'] as const).map(t => (
                                  <button key={t} onClick={() => {
                                      const newConfig = {...editingAiConfig, type: t};
                                      if (t === 'google') {
                                          newConfig.apiKey = '';
                                          newConfig.envSlot = undefined;
                                      }
                                      setEditingAiConfig(newConfig);
                                  }} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", editingAiConfig.type === t ? "bg-slate-800 text-cyan-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}>{t === 'google' ? 'Google Gemini' : 'OpenAI 兼容'}</button>
                              ))}
                          </div>
                      </div>
                      <div><label className="block text-sm font-bold text-slate-400 mb-2">模型 ID (例如 gemini-2.5-flash)</label><input value={editingAiConfig.model} onChange={(e) => setEditingAiConfig({...editingAiConfig, model: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 font-mono text-sm"/></div>
                      {editingAiConfig.type === 'openai' && (<div><label className="block text-sm font-bold text-slate-400 mb-2">Base URL</label><input value={editingAiConfig.baseUrl} onChange={(e) => setEditingAiConfig({...editingAiConfig, baseUrl: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 font-mono text-sm" placeholder="https://api.openai.com/v1"/></div>)}
                      
                      {/* Fix: Hide API key inputs for Google Gemini and show an informational message instead, per guidelines. */}
                      {editingAiConfig.type === 'google' ? (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <p className="text-sm text-slate-400">谷歌 Gemini API 密钥将自动从 <code className="font-mono bg-slate-700 text-cyan-400 px-1 py-0.5 rounded">API_KEY</code> 环境变量中读取。</p>
                        </div>
                      ) : (
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">API Key 来源</label>
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="radio" name="apiKeySource" checked={aiKeySource === 'manual'} onChange={() => { setAiKeySource('manual'); setEditingAiConfig({...editingAiConfig, envSlot: undefined}); }} className="accent-cyan-500"/> 手动输入</label>
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="radio" name="apiKeySource" checked={aiKeySource === 'env'} onChange={() => { setAiKeySource('env'); setEditingAiConfig({...editingAiConfig, apiKey: ''}); }} className="accent-cyan-500"/> 系统环境变量</label>
                            </div>
                            {aiKeySource === 'manual' ? (
                                <input type="password" placeholder="sk-..." value={editingAiConfig.apiKey} onChange={(e) => setEditingAiConfig({...editingAiConfig, apiKey: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 font-mono text-sm"/>
                            ) : (
                                <select value={editingAiConfig.envSlot || ''} onChange={(e) => setEditingAiConfig({...editingAiConfig, envSlot: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 text-sm">
                                    <option value="">选择环境变量...</option>
                                    <option value="API_KEY">API_KEY (主)</option>
                                    {[1,2,3,4,5].map(n => <option key={n} value={`CUSTOM_API_KEY_${n}`}>CUSTOM_API_KEY_{n}</option>)}
                                </select>
                            )}
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                           <span className="text-sm font-bold text-slate-400">启用此模型</span>
                           <button onClick={() => setEditingAiConfig({...editingAiConfig, isActive: !editingAiConfig.isActive})} className={cn("w-10 h-5 rounded-full relative transition-colors", editingAiConfig.isActive ? "bg-cyan-600" : "bg-slate-700")}><div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", editingAiConfig.isActive ? "left-6" : "left-1")}/></button>
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button onClick={() => handleTestConnection(editingAiConfig)} disabled={testStatus.status === 'loading'} className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex-1 flex items-center justify-center gap-2">{testStatus.status === 'loading' ? <LoadingSpinner/> : <Activity size={16}/>} 测试连接</button>
                          <button onClick={() => { const n = settings.aiConfigs.map(c => c.id === editingAiConfig.id ? editingAiConfig : c); const ns = {...settings, aiConfigs: n}; setLocalSettings(ns); saveSettings(ns); setEditingAiConfig(null); addToast('success', '配置已保存'); }} className="px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm flex-[2]">保存配置</button>
                      </div>
                      {testStatus.status !== 'idle' && (
                          <div className={cn("p-3 rounded-xl text-xs font-mono break-all", testStatus.status === 'success' ? "bg-emerald-900/20 text-emerald-400 border border-emerald-500/20" : "bg-red-900/20 text-red-400 border border-red-500/20")}>
                              {testStatus.status === 'success' ? <div className="flex items-center gap-2"><CircleCheck size={14}/> 连接成功</div> : <div className="flex items-start gap-2"><TriangleAlert size={14} className="shrink-0 mt-0.5"/> {testStatus.message}</div>}
                          </div>
                      )}
                  </div>
              </Modal>
          )}
          
          {confirmModal && (
            <Modal title="确认操作" onClose={() => setConfirmModal(null)} icon={<AlertCircle className="text-amber-400"/>}>
                <div className="p-6">
                    <p className="text-slate-300 mb-6">{confirmModal.message}</p>
                    <div className="flex justify-end gap-3"><button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg">取消</button><button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold">确定</button></div>
                </div>
            </Modal>
          )}
      </div>
    );
  }

  return renderViewMode();
};
