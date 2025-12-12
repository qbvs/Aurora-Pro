export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  color?: string; // Hex code for brand color
  clickCount?: number; // Track usage frequency
}

export interface Category {
  id: string;
  title: string;
  icon: string; // Icon name from Lucide
  links: LinkItem[];
}

export interface SearchEngine {
  id: string;
  name: string;
  baseUrl: string; // Used for Favicon
  searchUrlPattern: string; // e.g., https://www.google.com/search?q=
}

export interface AIProviderConfig {
  id: string;
  name: string;
  type: 'google' | 'openai'; // 'google' uses official SDK, 'openai' uses REST API (Longcat, etc.)
  baseUrl: string; // e.g., https://api.longcat.chat/openai
  apiKey: string; // The manual input key (for testing or direct use)
  envSlot?: string; // e.g., 'CUSTOM_API_KEY_1' - if set, prefer this over apiKey
  model: string; // e.g., gemini-2.5-flash or longcat-flash
  isActive: boolean;
}

export interface AppSettings {
  // Identity
  appName: string;
  appIcon: string; // Lucide Icon Name

  // Behavior
  theme: 'light' | 'dark' | 'system';
  openInNewTab: boolean;
  activeSearchEngineId: string;
  
  // AI Settings
  aiConfigs: AIProviderConfig[];

  // Appearance
  cardOpacity: number;
  backgroundMode: 'aurora' | 'monotone' | 'custom';
  customBackgroundImage?: string; // URL or Base64
  enableAiGreeting: boolean;
}

export interface AIResponse {
  title: string;
  description: string;
  categorySuggestion?: string;
  brandColor?: string;
  searchUrlPattern?: string; 
}


// --- MERGED LOGGER SERVICE ---

export interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'error' | 'warn';
  message: string;
}

const logs: LogEntry[] = [];
const listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(l => l());
};

export const addLog = (level: 'info' | 'error' | 'warn', message: any) => {
  const timestamp = new Date().toLocaleTimeString();
  const msgStr = typeof message === 'object' 
    ? (message instanceof Error ? message.message + '\n' + message.stack : JSON.stringify(message)) 
    : String(message);
    
  logs.unshift({ 
    id: Math.random().toString(36).substr(2, 9),
    time: timestamp, 
    level, 
    message: msgStr 
  });
  
  // Keep limit
  if (logs.length > 50) logs.pop();
  
  // Console mirroring
  if (level === 'error') console.error(message);
  else if (level === 'warn') console.warn(message);
  else console.log(message);

  notifyListeners();
};

export const getLogs = () => [...logs];

export const subscribeLogs = (callback: () => void) => {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  };
};

export const clearLogs = () => {
    logs.length = 0;
    notifyListeners();
};