
import { useState, useRef } from 'react';
import { LinkItem, LogEntry } from '../types';
import { ToastMsg } from '../components/ui/Toast';

type SidebarTab = 'dashboard' | 'general' | 'ai' | 'appearance' | 'search' | 'diagnose';

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

  // Transients
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clickedLinkId, setClickedLinkId] = useState<string | null>(null);
  const [brokenLinks, setBrokenLinks] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ catId: string; index: number } | null>(null);
  
  // Header Visibility Logic
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = (type: 'success' | 'error' | 'info', msg: string) => {
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

  return {
    activeTab, setActiveTab,
    viewCategory, setViewCategory,
    showLoginModal, setShowLoginModal,
    showQrModal, setShowQrModal,
    showAddCatModal, setShowAddCatModal,
    showGenLinksModal, setShowGenLinksModal,
    editingLink, setEditingLink,
    toasts, addToast, removeToast,
    searchTerm, setSearchTerm,
    clickedLinkId, setClickedLinkId,
    brokenLinks, setBrokenLinks,
    draggedItem, setDraggedItem,
    isHeaderVisible, handleContentScroll
  };
};
