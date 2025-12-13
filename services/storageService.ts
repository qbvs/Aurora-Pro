import { Category, AppSettings, SearchEngine } from '../types';
import { addLog } from './logger';

const DATA_KEY = 'aurora_data_v1';
const SETTINGS_KEY = 'aurora_settings_v1';
const ENGINES_KEY = 'aurora_engines_v1';

// Helper to check if KV is configured
export const isKVConfigured = (): boolean => {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return !!(url && url.length > 0 && token && token.length > 0);
};

// --- Cloud Sync Helpers (Vercel KV REST API) ---

const kvFetch = async (command: string, key: string, value?: any) => {
  if (!isKVConfigured()) {
      // Don't spam logs here, App.tsx handles the initial missing config warning.
      return null;
  }

  const baseUrl = process.env.KV_REST_API_URL?.replace(/\/$/, '');
  const url = `${baseUrl}/`;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const body = value !== undefined 
      ? JSON.stringify([command, key, JSON.stringify(value)]) // SET
      : JSON.stringify([command, key]); // GET

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: body,
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown Error');
        addLog('error', `KV Sync Error (${response.status}): ${errorText.substring(0, 100)}`);
        return null;
    }

    const result = await response.json();
    if (result.error) {
        addLog('error', `KV Command Error: ${result.error}`);
        return null;
    }

    if (result.result) {
       try {
         return typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
       } catch {
         return result.result;
       }
    }
    return null;
  } catch (error) {
    const msg = (error as any)?.message || String(error);
    addLog('error', `KV Network Exception: ${msg}`);
    return null;
  }
};

// --- Generic Helpers ---

const saveToLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

const getFromLocal = <T>(key: string): T | null => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

// --- Categories ---

export const saveCategories = async (categories: Category[]) => {
  saveToLocal(DATA_KEY, categories);
  // Async cloud save (fire and forget)
  if (isKVConfigured()) kvFetch('SET', DATA_KEY, categories);
};

export const loadCategories = async (): Promise<Category[] | null> => {
  // Always return local first for speed
  const local = getFromLocal<Category[]>(DATA_KEY);
  return local;
};

export const syncCategoriesFromCloud = async (): Promise<Category[] | null> => {
  if (!isKVConfigured()) return null;
  const cloudData = await kvFetch('GET', DATA_KEY);
  if (cloudData && Array.isArray(cloudData)) {
      saveToLocal(DATA_KEY, cloudData);
      return cloudData;
  }
  return null;
};

// --- Settings ---

export const saveSettings = async (settings: AppSettings) => {
  saveToLocal(SETTINGS_KEY, settings);
  if (isKVConfigured()) kvFetch('SET', SETTINGS_KEY, settings);
};

// FAST READ: Only reads local storage. Used by AI Service to avoid race conditions.
export const getSettingsLocal = (): AppSettings | null => {
    return getFromLocal<AppSettings>(SETTINGS_KEY);
};

// SLOW SYNC: Used by App on init.
export const loadSettings = async (): Promise<AppSettings | null> => {
  // Return local immediately for UI rendering if needed (handled by App.tsx state)
  return getFromLocal<AppSettings>(SETTINGS_KEY);
};

export const syncSettingsFromCloud = async (): Promise<AppSettings | null> => {
    if (!isKVConfigured()) return null;
    const cloudData = await kvFetch('GET', SETTINGS_KEY);
    if (cloudData) {
        saveToLocal(SETTINGS_KEY, cloudData);
        return cloudData as AppSettings;
    }
    return null;
};

// --- Search Engines ---

export const saveSearchEngines = async (engines: SearchEngine[]) => {
  saveToLocal(ENGINES_KEY, engines);
  if (isKVConfigured()) kvFetch('SET', ENGINES_KEY, engines);
};

export const loadSearchEngines = async (): Promise<SearchEngine[] | null> => {
  return getFromLocal<SearchEngine[]>(ENGINES_KEY);
};

export const syncSearchEnginesFromCloud = async (): Promise<SearchEngine[] | null> => {
    if (!isKVConfigured()) return null;
    const cloudData = await kvFetch('GET', ENGINES_KEY);
    if (cloudData && Array.isArray(cloudData)) {
        saveToLocal(ENGINES_KEY, cloudData);
        return cloudData;
    }
    return null;
};