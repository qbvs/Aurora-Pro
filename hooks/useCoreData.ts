
import { useState, useEffect } from 'react';
import { Category, LinkItem } from '../types';
import { INITIAL_DATA } from '../constants';
import { 
    loadCategories, saveCategories, verifyCloudConnection, syncCategoriesFromCloud 
} from '../services/storageService';
import { addLog } from '../services/logger';

const COMMON_REC_ID = 'rec-1';
type CloudSyncStatus = 'checking' | 'connected' | 'disconnected';

// Helper: Check favicon validity (kept local here or move to utils)
const checkFavicon = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const hostname = new URL(url).hostname;
            if (!hostname) { resolve(false); return; }
            resolve(true); 
        } catch { resolve(false); }
    });
};

export const useCoreData = () => {
  const [categories, setCategories] = useState<Category[]>(INITIAL_DATA);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('checking');

  // Logic: Recalculate Common Recommendations
  const updateCommonRecommendations = (cats: Category[]): Category[] => {
      let allLinks: LinkItem[] = [];
      const seenUrls = new Set<string>();
      if (!cats) return [];
      cats.forEach(cat => {
          if (cat.id === COMMON_REC_ID) return;
          if (cat.links) {
              cat.links.forEach(link => {
                 const normalizedUrl = link.url.trim().replace(/\/$/, '');
                 if (!seenUrls.has(normalizedUrl)) {
                     allLinks.push(link);
                     seenUrls.add(normalizedUrl);
                 }
              });
          }
      });
      allLinks.sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));
      const topLinks = allLinks.slice(0, 8);
      const newCommonCat: Category = {
          id: COMMON_REC_ID, title: '常用推荐', icon: 'Flame',
          links: topLinks.map(l => ({...l, id: `rec-${l.id}`}))
      };
      const commonCatIndex = cats.findIndex(c => c.id === COMMON_REC_ID);
      if (commonCatIndex >= 0) {
          const newCats = [...cats];
          newCats[commonCatIndex] = newCommonCat;
          return newCats;
      } else {
          return [newCommonCat, ...cats];
      }
  };

  // Logic: Save Data wrapper
  const handleSaveData = async (newCats: Category[]) => {
      const updated = updateCommonRecommendations(newCats);
      setCategories(updated);
      await saveCategories(updated);
  };

  // Init Data
  useEffect(() => {
    const init = async () => {
        try {
            const localCats = await loadCategories();
            if (localCats) setCategories(updateCommonRecommendations(localCats));
            
            const isConnected = await verifyCloudConnection();
            if (isConnected) {
                setCloudSyncStatus('connected');
                addLog('info', '云同步服务已连接');
                const cloudData = await syncCategoriesFromCloud();
                if (cloudData) {
                    setCategories(updateCommonRecommendations(cloudData));
                    addLog('info', '云端同步成功');
                }
            } else {
                setCloudSyncStatus('disconnected');
                addLog('warn', '未配置或无法连接云同步服务');
            }
        } catch (e) {
            console.error(e);
            setCloudSyncStatus('disconnected');
        }
    };
    init();
  }, []);

  // Actions
  const handleLinkClick = async (category: Category, link: LinkItem, openInNewTab: boolean) => {
      window.open(link.url, openInNewTab ? '_blank' : '_self');
      const newCats = categories.map(cat => {
          if (cat.id === COMMON_REC_ID) return cat;
          const hasLink = cat.links.some(l => l.url === link.url);
          return hasLink ? { ...cat, links: cat.links.map(l => l.url === link.url ? { ...l, clickCount: (l.clickCount || 0) + 1 } : l) } : cat;
      });
      handleSaveData(newCats);
  };

  const handleSaveLink = async (editingLink: { catId: string, link?: LinkItem }, linkData: Partial<LinkItem>) => { 
      if (!linkData.title || !linkData.url) return; 
      await checkFavicon(linkData.url); 
      const newLink: LinkItem = { 
          id: linkData.id || `l-${Date.now()}`, 
          title: linkData.title, 
          url: linkData.url.startsWith('http') ? linkData.url : `https://${linkData.url}`, 
          description: linkData.description || '', 
          color: linkData.color || '#666', 
          clickCount: linkData.clickCount || 0, 
          pros: linkData.pros, 
          cons: linkData.cons, 
          language: linkData.language 
      }; 
      let newCats = categories.map(cat => { 
          if (cat.id !== editingLink.catId) return cat; 
          return editingLink.link ? { ...cat, links: cat.links.map(l => l.id === editingLink.link!.id ? newLink : l) } : { ...cat, links: [...cat.links, newLink] }; 
      }); 
      handleSaveData(newCats); 
  };

  const handleDeleteLink = (catId: string, linkId: string) => {
      const newCats = categories.map(c => c.id === catId ? {...c, links: c.links.filter(l => l.id !== linkId)} : c);
      handleSaveData(newCats);
  };

  const handleDeleteCategory = (category: Category) => {
      const newCats = categories.filter(c => c.id !== category.id);
      handleSaveData(newCats);
  };

  const handleSaveGeneratedLinks = (newLinks: LinkItem[], catId: string) => {
      let newCats = categories.map(cat => cat.id !== catId ? cat : { ...cat, links: [...cat.links, ...newLinks] }); 
      handleSaveData(newCats); 
  };

  const handleDrop = (draggedItem: { catId: string; index: number }, targetCatId: string, targetIndex: number) => {
      if (draggedItem.catId === targetCatId && draggedItem.index === targetIndex) return;
      const newCats = [...categories];
      const sourceCatIndex = newCats.findIndex(c => c.id === draggedItem.catId);
      const targetCatIndex = newCats.findIndex(c => c.id === targetCatId);
      if (sourceCatIndex === -1 || targetCatIndex === -1) return;

      const sourceLinks = [...newCats[sourceCatIndex].links];
      const targetLinks = sourceCatIndex === targetCatIndex ? sourceLinks : [...newCats[targetCatIndex].links];
      const [movedItem] = sourceLinks.splice(draggedItem.index, 1);
      targetLinks.splice(targetIndex, 0, movedItem);
      newCats[sourceCatIndex].links = sourceLinks;
      if (sourceCatIndex !== targetCatIndex) {
          newCats[targetCatIndex].links = targetLinks;
      }
      handleSaveData(newCats);
  };

  return {
      categories, setCategories,
      cloudSyncStatus,
      handleSaveData,
      handleLinkClick,
      handleSaveLink,
      handleDeleteLink,
      handleDeleteCategory,
      handleSaveGeneratedLinks,
      handleDrop
  };
};