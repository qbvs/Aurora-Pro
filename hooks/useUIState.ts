
import { useState, useRef, useEffect } from 'react';
import { LinkItem, LogEntry } from '../types';
import { ToastMsg } from '../components/ui/Toast';

// Added 'automation' to the type
type SidebarTab = 'dashboard' | 'widgets' | 'automation' | 'general' | 'ai' | 'appearance' | 'search' | 'diagnose';

export const useUIState = () => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [viewCategory, setViewCategory] = useState<string | null>(null);

  // Modals & Overlays
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<string | null>(null);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showGenLinksModal, setShowGenLinksModal] = useState<{id: string, title: string} | null>(null);
  const [editingLink, setEditingLink] = useState<{ catId: string, link?: LinkItem } | null>(null);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  
  // New: 存储被拦截的 URL 列表
  const [blockedUrls, setBlockedUrls] = useState<string[]>([]);

  // Transients
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clickedLinkId, setClickedLinkId] = useState<string | null>(null);
  const [brokenLinks, setBrokenLinks] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ catId: string; index: number } | null>(null);
  
  // Header Visibility Logic
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = (type: 'success' | 'error' | 'info' | 'warn', msg: string) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, type, msg }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const removeToast = (id: number) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleContentScroll = () => {
      setIsHeaderVisible(false);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
          setIsHeaderVisible(true);
      }, 500); 
  };
  
  // Keyboard Shortcuts for Command Palette
  useEffect(() => {
      const down = (e: KeyboardEvent) => {
          if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
              e.preventDefault();
              setShowCmdPalette(prev => !prev);
          }
      };
      document.addEventListener('keydown', down);
      return () => document.removeEventListener('keydown', down);
  }, []);

  return {
    activeTab, setActiveTab,
    viewCategory, setViewCategory,
    showLoginModal, setShowLoginModal,
    showQrModal, setShowQrModal,
    showAddCatModal, setShowAddCatModal,
    showGenLinksModal, setShowGenLinksModal,
    editingLink, setEditingLink,
    showCmdPalette, setShowCmdPalette,
    blockedUrls, setBlockedUrls, // Exported
    toasts, addToast, removeToast,
    searchTerm, setSearchTerm,
    clickedLinkId, setClickedLinkId,
    brokenLinks, setBrokenLinks,
    draggedItem, setDraggedItem,
    isHeaderVisible, handleContentScroll
  };
};
