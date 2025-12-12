import { Category, AppSettings, SearchEngine } from './types';

export const INITIAL_SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'se-google',
    name: 'Google',
    baseUrl: 'https://www.google.com',
    searchUrlPattern: 'https://www.google.com/search?q='
  },
  {
    id: 'se-baidu',
    name: 'Baidu',
    baseUrl: 'https://www.baidu.com',
    searchUrlPattern: 'https://www.baidu.com/s?wd='
  },
  {
    id: 'se-bing',
    name: 'Bing',
    baseUrl: 'https://www.bing.com',
    searchUrlPattern: 'https://www.bing.com/search?q='
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  appName: 'Aurora Pro',
  appIcon: 'Zap',
  theme: 'system',
  openInNewTab: true,
  activeSearchEngineId: 'se-google',
  cardOpacity: 80,
  backgroundMode: 'aurora',
  enableAiGreeting: true,
};

export const INITIAL_DATA: Category[] = [
  {
    id: 'rec-1',
    title: '常用推荐',
    icon: 'Flame',
    links: [
      {
        id: 'l-1',
        title: 'GitHub',
        url: 'https://github.com',
        description: '代码托管平台',
        color: '#181717',
      },
      {
        id: 'l-2',
        title: 'ChatGPT',
        url: 'https://chat.openai.com',
        description: 'AI 助手',
        color: '#10A37F',
      },
      {
        id: 'l-3',
        title: 'Vercel',
        url: 'https://vercel.com',
        description: '前端部署神器',
        color: '#000000',
      },
      {
        id: 'l-4',
        title: 'YouTube',
        url: 'https://youtube.com',
        description: '视频娱乐',
        color: '#FF0000',
      },
    ],
  },
  {
    id: 'dev-1',
    title: '开发工具',
    icon: 'Laptop',
    links: [
      {
        id: 'l-5',
        title: 'Stack Overflow',
        url: 'https://stackoverflow.com',
        description: '技术问答',
        color: '#F48024',
      },
      {
        id: 'l-6',
        title: 'Tailwind CSS',
        url: 'https://tailwindcss.com',
        description: '原子化 CSS 框架',
        color: '#38B2AC',
      },
      {
        id: 'l-7',
        title: 'React Docs',
        url: 'https://react.dev',
        description: 'React 官方文档',
        color: '#61DAFB',
      },
    ],
  },
  {
    id: 'design-1',
    title: '设计灵感',
    icon: 'Palette',
    links: [
        {
            id: 'l-8',
            title: 'Dribbble',
            url: 'https://dribbble.com',
            description: '设计作品分享',
            color: '#EA4C89'
        }
    ]
  }
];
