
import { useState, useEffect } from 'react';
import { generateCategoryLinks, getAiGreeting } from '../services/geminiService';
import { Category, Language } from '../types';

export const useAI = (categories: Category[], enableGreeting: boolean, language: Language) => {
  const [aiGreeting, setAiGreeting] = useState<string>('');

  useEffect(() => {
      if (!enableGreeting) return;
      // 缓存键增加语言后缀，避免切换语言后显示旧缓存
      const cacheKey = `aurora_greeting_v7_${language}`;
      const cached = localStorage.getItem(cacheKey); 
      if (cached) {
          const { text, expiry } = JSON.parse(cached);
          if (Date.now() < expiry) { setAiGreeting(text); return; }
      }
      getAiGreeting(language).then(text => {
          if (text) {
              setAiGreeting(text);
              localStorage.setItem(cacheKey, JSON.stringify({ text, expiry: Date.now() + 14400000 }));
          }
      });
  }, [enableGreeting, language]);

  const handleAiRefreshGreeting = async () => {
      const text = await getAiGreeting(language);
      if (text) {
          const cacheKey = `aurora_greeting_v7_${language}`;
          localStorage.setItem(cacheKey, JSON.stringify({ text, expiry: Date.now() + 14400000 }));
      }
      return text;
  };

  const handleAiDiscovery = async (topic: string) => {
      const allExistingUrls = new Set<string>();
      categories.forEach(cat => cat.links.forEach(link => allExistingUrls.add(link.url.toLowerCase().replace(/\/$/, ""))));
      const newLinks = await generateCategoryLinks(topic, 3, Array.from(allExistingUrls));
      return newLinks.filter(l => l.title && l.url);
  };

  return { aiGreeting, handleAiRefreshGreeting, handleAiDiscovery };
};
