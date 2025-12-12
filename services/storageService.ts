import { Category, AppSettings, SearchEngine } from '../types';

const DATA_KEY = 'aurora_data_v1';
const SETTINGS_KEY = 'aurora_settings_v1';
const ENGINES_KEY = 'aurora_engines_v1';

// Helper to check if KV is configured
export const isKVConfigured = (): boolean => {
  // In a real environment, check if the env vars are present
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
};

export const saveCategories = (categories: Category[]) => {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(categories));
    // TODO: Add actual Vercel KV put logic here if needed
  } catch (e) {
    console.error("Storage failed", e);
  }
};

export const loadCategories = (): Category[] | null => {
  try {
    const data = localStorage.getItem(DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadSettings = (): AppSettings | null => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const saveSearchEngines = (engines: SearchEngine[]) => {
  localStorage.setItem(ENGINES_KEY, JSON.stringify(engines));
};

export const loadSearchEngines = (): SearchEngine[] | null => {
  try {
    const data = localStorage.getItem(ENGINES_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};
