
import { zh } from '../locales/zh';
import { en } from '../locales/en';
import { ja } from '../locales/ja';
import { Language } from '../types';

const locales = { zh, en, ja };

export const useI18n = (currentLang: Language = 'zh') => {
  const dict = locales[currentLang] || locales.zh;

  const t = (path: string, params?: Record<string, string>) => {
    const keys = path.split('.');
    let value: any = dict;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key as keyof typeof value];
      } else {
        // console.warn(`Translation missing for key: ${path} in ${currentLang}`);
        return path; // Fallback to key
      }
    }

    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] || `{{${k}}}`);
    }

    return value as string;
  };

  return { t, lang: currentLang };
};
