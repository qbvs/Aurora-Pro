import { Category, AppSettings, SearchEngine } from '../types';

const DATA_KEY = 'aurora_data_v1';
const SETTINGS_KEY = 'aurora_settings_v1';
const ENGINES_KEY = 'aurora_engines_v1';

// Helper to check if KV is configured
export const isKVConfigured = (): boolean => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
};

// --- Cloud Sync Helpers (Vercel KV REST API) ---

const kvFetch = async (command: string, key: string, value?: any) => {
  if (!isKVConfigured()) return null;

  const url = `${process.env.KV_REST_API_URL}/`;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const body = value !== undefined 
      ? JSON.stringify([command, key, JSON.stringify(value)]) // SET
      : JSON.stringify([command, key]); // GET

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: body,
    });

    const result = await response.json();
    
    // Vercel KV REST response format: { result: "..." }
    if (result.result) {
       // If it's a GET command, the result is the JSON string we stored
       try {
         return typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
       } catch {
         return result.result;
       }
    }
    return null;
  } catch (error) {
    console.error(`KV Error [${command}]:`, error);
    return null;
  }
};

// --- Categories ---

export const saveCategories = async (categories: Category[]) => {
  // 1. Save Local
  localStorage.setItem(DATA_KEY, JSON.stringify(categories));
  
  // 2. Save Cloud (Fire and forget to avoid UI blocking, or await if needed)
  if (isKVConfigured()) {
    await kvFetch('SET', DATA_KEY, categories);
  }
};

export const loadCategories = async (): Promise<Category[] | null> => {
  // 1. Try Cloud First for latest data
  if (isKVConfigured()) {
    const cloudData = await kvFetch('GET', DATA_KEY);
    if (cloudData && Array.isArray(cloudData)) {
      // Update local cache to match cloud
      localStorage.setItem(DATA_KEY, JSON.stringify(cloudData));
      return cloudData;
    }
  }

  // 2. Fallback to Local
  try {
    const data = localStorage.getItem(DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

// --- Settings ---

export const saveSettings = async (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  if (isKVConfigured()) {
    await kvFetch('SET', SETTINGS_KEY, settings);
  }
};

export const loadSettings = async (): Promise<AppSettings | null> => {
  if (isKVConfigured()) {
    const cloudData = await kvFetch('GET', SETTINGS_KEY);
    if (cloudData) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(cloudData));
      return cloudData as AppSettings;
    }
  }

  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

// --- Search Engines ---

export const saveSearchEngines = async (engines: SearchEngine[]) => {
  localStorage.setItem(ENGINES_KEY, JSON.stringify(engines));
  if (isKVConfigured()) {
    await kvFetch('SET', ENGINES_KEY, engines);
  }
};

export const loadSearchEngines = async (): Promise<SearchEngine[] | null> => {
  if (isKVConfigured()) {
    const cloudData = await kvFetch('GET', ENGINES_KEY);
    if (cloudData && Array.isArray(cloudData)) {
       localStorage.setItem(ENGINES_KEY, JSON.stringify(cloudData));
       return cloudData;
    }
  }

  try {
    const data = localStorage.getItem(ENGINES_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};