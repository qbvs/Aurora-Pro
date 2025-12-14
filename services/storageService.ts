import { Category, AppSettings, SearchEngine } from '../types';
import { kvFetch } from './storage/cloudAdapter';

// 重新导出验证函数，供外部使用
export { verifyCloudConnection } from './storage/cloudAdapter';

const KEYS = { DATA: 'aurora_data_v1', SETTINGS: 'aurora_settings_v1', ENGINES: 'aurora_engines_v1' };

// --- 本地存储辅助 ---
const saveLocal = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v));
const getLocal = <T>(k: string): T | null => {
    try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : null; } 
    catch { return null; }
};

// --- 分类数据 ---
export const saveCategories = async (data: Category[]) => {
  saveLocal(KEYS.DATA, data);
  kvFetch('SET', KEYS.DATA, data); // 异步触发云同步，不阻塞 UI
};

export const loadCategories = async (): Promise<Category[] | null> => getLocal<Category[]>(KEYS.DATA);

export const syncCategoriesFromCloud = async (): Promise<Category[] | null> => {
  const data = await kvFetch('GET', KEYS.DATA);
  if (data && Array.isArray(data)) {
      saveLocal(KEYS.DATA, data);
      return data;
  }
  return null;
};

// --- 设置数据 ---
export const saveSettings = async (data: AppSettings) => {
  saveLocal(KEYS.SETTINGS, data);
  kvFetch('SET', KEYS.SETTINGS, data);
};

export const loadSettings = async (): Promise<AppSettings | null> => getLocal<AppSettings>(KEYS.SETTINGS);

// 修复: 提供同步获取方法，供 AI 服务等非异步上下文使用
// 之前是 loadSettings 的别名 (async)，导致 ai/core.ts 中类型错误
export const getSettingsLocal = (): AppSettings | null => getLocal<AppSettings>(KEYS.SETTINGS);

export const syncSettingsFromCloud = async (): Promise<AppSettings | null> => {
    const data = await kvFetch('GET', KEYS.SETTINGS);
    if (data) { saveLocal(KEYS.SETTINGS, data); return data; }
    return null;
};

// --- 搜索引擎数据 ---
export const saveSearchEngines = async (data: SearchEngine[]) => {
  saveLocal(KEYS.ENGINES, data);
  kvFetch('SET', KEYS.ENGINES, data);
};

export const loadSearchEngines = async (): Promise<SearchEngine[] | null> => getLocal<SearchEngine[]>(KEYS.ENGINES);

export const syncSearchEnginesFromCloud = async (): Promise<SearchEngine[] | null> => {
    const data = await kvFetch('GET', KEYS.ENGINES);
    if (data && Array.isArray(data)) { saveLocal(KEYS.ENGINES, data); return data; }
    return null;
};