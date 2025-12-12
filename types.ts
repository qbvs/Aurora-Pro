export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  color?: string; // Hex code for brand color
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

export interface AppSettings {
  // Identity
  appName: string;
  appIcon: string; // Lucide Icon Name

  // Behavior
  theme: 'light' | 'dark' | 'system';
  openInNewTab: boolean;
  activeSearchEngineId: string;
  
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
