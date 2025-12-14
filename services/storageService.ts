
import { Category, AppSettings, SearchEngine } from '../types';
import { addLog } from './logger';

const DATA_KEY = 'aurora_data_v1';
const SETTINGS_KEY = 'aurora_settings_v1';
const ENGINES_KEY = 'aurora_engines_v1';

// Internal helper to check if Vercel KV env vars are present
const isVercelKVConfigured = () => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
};

// New function to actively test the connection to the cloud KV store.
export const verifyCloudConnection = async (): Promise<boolean> => {
    if (isVercelKVConfigured()) {
        try {
            const baseUrl = process.env.KV_REST_API_URL?.replace(/\/$/, '');
            const url = `${baseUrl}/get/aurora-connection-test-key`;
            const token = process.env.KV_REST_API_TOKEN;
            const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            // Any non-server-error response (like 404 Not Found or 401 Unauthorized)
            // means the service itself is configured and reachable.
            return response.status < 500;
        } catch {
            return false;
        }
    } else {
        // For Cloudflare, we must check if the function endpoint exists and is not misconfigured.
        try {
            const response = await fetch(`/api/storage?key=aurora-connection-test-key`);
            // response.ok is true for statuses 200-299.
            // A 404 means the function doesn't exist.
            // A 500 means it exists but the KV binding is broken.
            // Both will result in response.ok being false.
            return response.ok;
        } catch {
            // This catches network errors if the fetch itself fails.
            return false;
        }
    }
};


// --- Universal Sync Helper ---
const kvFetch = async (command: 'GET' | 'SET', key: string, value?: any) => {
  try {
    // Strategy 1: Vercel KV
    if (isVercelKVConfigured()) {
      const baseUrl = process.env.KV_REST_API_URL?.replace(/\/$/, '');
      const url = `${baseUrl}/`;
      const token = process.env.KV_REST_API_TOKEN;

      const body = command === 'SET' 
        ? JSON.stringify([command, key, JSON.stringify(value)])
        : JSON.stringify([command, key]);

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: body,
      });

      if (!response.ok) throw new Error(`Vercel KV Error (${response.status})`);
      
      const result = await response.json();
      if (result.error) throw new Error(`Vercel KV Command Error: ${result.error}`);

      if (result.result) {
         try {
           return typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
         } catch {
           return result.result;
         }
      }
      return null;
    } 
    // Strategy 2: Cloudflare KV via Functions
    else {
      const apiUrl = `/api/storage?key=${key}`;
      if (command === 'GET') {
        const response = await fetch(apiUrl);
        if (!response.ok) return null;
        return await response.json();
      } 
      else if (command === 'SET') {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        });
        if (!response.ok) throw new Error('Cloudflare KV Write Failed');
        return value;
      }
    }
  } catch (error) {
    const msg = (error as any)?.message || String(error);
    addLog('warn', `Cloud Sync API call failed: ${msg}`);
    return null; // Fail silently for individual operations
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
  kvFetch('SET', DATA_KEY, categories);
};

export const loadCategories = async (): Promise<Category[] | null> => {
  return getFromLocal<Category[]>(DATA_KEY);
};

export const syncCategoriesFromCloud = async (): Promise<Category[] | null> => {
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
  kvFetch('SET', SETTINGS_KEY, settings);
};

export const getSettingsLocal = (): AppSettings | null => {
    return getFromLocal<AppSettings>(SETTINGS_KEY);
};

export const loadSettings = async (): Promise<AppSettings | null> => {
  return getFromLocal<AppSettings>(SETTINGS_KEY);
};

export const syncSettingsFromCloud = async (): Promise<AppSettings | null> => {
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
  kvFetch('SET', ENGINES_KEY, engines);
};

export const loadSearchEngines = async (): Promise<SearchEngine[] | null> => {
  return getFromLocal<SearchEngine[]>(ENGINES_KEY);
};

export const syncSearchEnginesFromCloud = async (): Promise<SearchEngine[] | null> => {
    const cloudData = await kvFetch('GET', ENGINES_KEY);
    if (cloudData && Array.isArray(cloudData)) {
        saveToLocal(ENGINES_KEY, cloudData);
        return cloudData;
    }
    return null;
};
