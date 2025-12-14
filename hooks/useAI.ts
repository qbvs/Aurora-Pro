
import { useState, useEffect } from 'react';
import { generateCategoryLinks, getAiGreeting } from '../services/geminiService';
import { Category } from '../types';

export const useAI = (categories: Category[], enableGreeting: boolean) => {
  const [aiGreeting, setAiGreeting] = useState<string>('');

  useEffect(() => {
      if (!enableGreeting) return;
      const cached = localStorage.getItem('aurora_greeting_v7'); 
      if (cached) {
          const { text, expiry } = JSON.parse(cached);
          if (Date.now() < expiry) { setAiGreeting(text); return; }
      }
      getAiGreeting().then(text => {
          if (text) {
              setAiGreeting(text);
              localStorage.setItem('aurora_greeting_v7', JSON.stringify({ text, expiry: Date.now() + 14400000 }));
          }
      });
  }, [enableGreeting]);

  const handleAiRefreshGreeting = async () => {
      const text = await getAiGreeting();
      if (text) localStorage.setItem('aurora_greeting_v7', JSON.stringify({ text, expiry: Date.now() + 14400000 }));
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
