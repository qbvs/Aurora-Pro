
import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, Sun, Moon, Settings, LogIn, ExternalLink } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import { Category, LinkItem } from '../../types';
import { cn } from '../../utils';
import { Favicon } from '../Favicon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onNavigate: (url: string) => void;
  onToggleTheme: () => void;
  onOpenAdmin: () => void;
  isAuthenticated: boolean;
}

export const CmdPalette: React.FC<Props> = ({ 
  isOpen, onClose, categories, onNavigate, onToggleTheme, onOpenAdmin, isAuthenticated 
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 扁平化所有可搜索项
  const allItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      type: 'link' | 'action';
      title: string;
      subtitle?: string;
      icon?: React.ReactNode;
      action: () => void;
      group: string;
    }> = [];

    // 1. 系统动作
    items.push({
      id: 'act-theme', type: 'action', title: t('cmd.action_theme'), group: t('cmd.section_system'),
      icon: <Sun size={18}/>, action: onToggleTheme
    });

    if (isAuthenticated) {
        items.push({
            id: 'act-admin', type: 'action', title: t('cmd.action_admin'), group: t('cmd.section_system'),
            icon: <Settings size={18}/>, action: onOpenAdmin
        });
    } else {
        items.push({
            id: 'act-login', type: 'action', title: t('cmd.action_login'), group: t('cmd.section_system'),
            icon: <LogIn size={18}/>, action: onOpenAdmin
        });
    }

    // 2. 链接搜索 (简单的模糊匹配)
    categories.forEach(cat => {
        cat.links.forEach(link => {
            items.push({
                id: link.id,
                type: 'link',
                title: link.title,
                subtitle: link.description || link.url,
                icon: <Favicon url={link.url} size={18} className="rounded-sm"/>,
                action: () => onNavigate(link.url),
                group: t('cmd.section_links')
            });
        });
    });

    return items;
  }, [categories, isAuthenticated, t]);

  // 过滤逻辑
  const filteredItems = React.useMemo(() => {
    if (!query) return allItems.slice(0, 8); // 默认显示前8个
    const lowerQ = query.toLowerCase();
    return allItems.filter(item => 
        item.title.toLowerCase().includes(lowerQ) || 
        item.subtitle?.toLowerCase().includes(lowerQ)
    ).slice(0, 10);
  }, [query, allItems]);

  // 快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredItems[selectedIndex]) {
                filteredItems[selectedIndex].action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  useEffect(() => {
      if (isOpen) {
          setQuery('');
          setSelectedIndex(0);
          // 延迟聚焦，等待动画
          setTimeout(() => inputRef.current?.focus(), 50);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        {/* 背景遮罩 */}
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
        
        {/* 面板主体 */}
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden animate-scale-in flex flex-col max-h-[60vh]">
            <div className="flex items-center px-4 py-4 border-b border-slate-200 dark:border-slate-800">
                <Command className="text-slate-400 mr-3" size={20} />
                <input 
                    ref={inputRef}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                    className="flex-1 bg-transparent outline-none text-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    placeholder={t('cmd.placeholder')}
                />
                <button onClick={onClose} className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">ESC</button>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-2">
                {filteredItems.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                        <Search size={32} className="mx-auto mb-3 opacity-50"/>
                        <p>{t('cmd.no_results')}</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredItems.map((item, index) => (
                            <button
                                key={item.id}
                                onClick={() => { item.action(); onClose(); }}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left group",
                                    index === selectedIndex 
                                        ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20" 
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                                    index === selectedIndex ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                )}>
                                    {item.icon || <ExternalLink size={16}/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate">{item.title}</div>
                                    {item.subtitle && (
                                        <div className={cn("text-xs truncate", index === selectedIndex ? "text-white/80" : "text-slate-400")}>
                                            {item.subtitle}
                                        </div>
                                    )}
                                </div>
                                <div className={cn("text-xs font-medium px-2 py-0.5 rounded", index === selectedIndex ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>
                                    {item.group}
                                </div>
                                {index === selectedIndex && <ArrowRight size={16} className="animate-pulse"/>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between">
                <div className="flex gap-4">
                    <span>↑↓ 导航</span>
                    <span>↵ 选择</span>
                </div>
                <div>Aurora Pro v2.0</div>
            </div>
        </div>
    </div>
  );
};
