
// --- 基础实体 ---

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  icon?: string; // 手动指定的图标
  color?: string; // 品牌色
  clickCount?: number;
  
  // 功能 9: 布局自由度 (Masonry Layout)
  size?: 'small' | 'medium' | 'large'; // small=1x1, medium=2x1, large=2x2
  
  // 功能 6: AI 摘要
  aiSummary?: string; 
  
  // 功能 4: 隐私模式
  isPrivate?: boolean; // 仅在登录后或通过 PIN 码显示
  
  tags?: string[];
  language?: string;
  pros?: string;
  cons?: string;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  links: LinkItem[];
  
  // 功能 4: 隐私分类
  isPrivate?: boolean; 
  accessPin?: string; // 如果设置了 PIN，前台输入后可见
}

// --- 功能 1: 模块化小部件 (Modular Widgets) ---

export type WidgetType = 'clock' | 'weather' | 'todo' | 'calendar' | 'system_monitor' | 'search';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string;
  
  // 布局位置
  w: number; // grid width (1-4)
  h: number; // grid height (1-4)
  x?: number; // layout x (optional for auto-layout)
  y?: number; // layout y (optional for auto-layout)
  
  // 小部件特定数据
  data?: any; 
  settings?: Record<string, any>; // 例如天气城市、时区等
}

// --- 功能 7: 智能工作流 (Smart Workflows) ---

export interface WorkflowAction {
  id: string;
  type: 'open_url' | 'copy_text' | 'ai_query';
  value: string; // URL 或 文本
  delay?: number; // 延迟毫秒
}

export interface Workflow {
  id: string;
  name: string;
  icon: string;
  description?: string;
  actions: WorkflowAction[];
  trigger?: 'manual' | 'startup' | 'schedule';
}

// --- 核心配置 ---

export interface SearchEngine {
  id: string;
  name: string;
  baseUrl: string;
  searchUrlPattern: string;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  type: 'google' | 'openai';
  baseUrl: string;
  apiKey: string;
  envSlot?: string;
  model: string;
  isActive: boolean;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  qrCode?: string;
}

export type Language = 'zh' | 'en' | 'ja';

export interface AppSettings {
  // 身份
  appName: string;
  appIcon: string;
  logoMode: 'icon' | 'image';
  customLogoUrl?: string;
  userName?: string;

  // 行为
  theme: 'light' | 'dark' | 'system';
  language: Language; // 功能 10: 国际化
  openInNewTab: boolean;
  activeSearchEngineId: string;
  
  // AI 设置
  aiConfigs: AIProviderConfig[];
  enableAiGreeting: boolean;
  enableAiSummary: boolean; // 功能 6: 鼠标悬停显示 AI 摘要

  // 外观
  cardOpacity: number;
  backgroundMode: 'aurora' | 'monotone' | 'custom';
  customBackgroundImage?: string;
  backgroundBlur: number;
  backgroundMaskOpacity: number;
  
  // 功能 9: 布局模式
  layoutMode: 'standard' | 'masonry' | 'dashboard';
  
  // 功能 1: 已启用的小部件
  widgets: WidgetConfig[];
  
  // 功能 7: 工作流
  workflows: Workflow[];
  
  footerHtml?: string;
  socialLinks: SocialLink[];
}

// --- 主题导出结构 (不包含敏感信息) ---
export interface ThemeConfig {
  name: string;
  author?: string;
  settings: Pick<AppSettings, 'theme' | 'cardOpacity' | 'backgroundMode' | 'customBackgroundImage' | 'backgroundBlur' | 'backgroundMaskOpacity'>;
}

// --- 系统日志 ---

export interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'error' | 'warn';
  message: string;
}

// --- AI 响应结构 ---
export interface AIResponse {
  title: string;
  description: string;
  brandColor?: string;
  pros?: string;
  cons?: string;
  language?: string;
  categorySuggestion?: string;
}
