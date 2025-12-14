
import React from 'react';
import { 
  Plus, Edit, Trash2, Wand2, ChevronUp, ChevronDown, Lock, Unlock, Scaling
} from 'lucide-react';
import { Category, LinkItem } from '../../types';
import { Icon } from '../Icon';
import { Favicon } from '../Favicon';
import { cn } from '../../utils';

interface DashboardProps {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  onSaveData: (cats: Category[]) => void;
  onOpenGenModal: (catId: string, title: string) => void;
  onOpenAddCat: () => void;
  onEditLink: (catId: string, link?: LinkItem) => void;
  onDeleteLink: (catId: string, linkId: string) => void;
  onDeleteCategory: (cat: Category) => void;
  setBrokenLinks: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  draggedItem: { catId: string; index: number } | null;
  onDragStart: (e: React.DragEvent, catId: string, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetCatId: string, targetIndex: number) => void;
}

const COMMON_REC_ID = 'rec-1'; 

// 尺寸映射辅助函数
const getSizeClasses = (size?: 'small' | 'medium' | 'large') => {
    switch (size) {
        case 'medium': return 'col-span-1 sm:col-span-2'; 
        case 'large': return 'col-span-1 sm:col-span-2 row-span-2 min-h-[200px]'; 
        default: return 'col-span-1'; 
    }
};

export const Dashboard: React.FC<DashboardProps> = ({
  categories,
  setCategories,
  onSaveData,
  onOpenGenModal,
  onOpenAddCat,
  onEditLink,
  onDeleteLink,
  onDeleteCategory,
  setBrokenLinks,
  draggedItem,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  
  const toggleCatPrivacy = (idx: number) => {
      const n = [...categories];
      n[idx].isPrivate = !n[idx].isPrivate;
      onSaveData(n);
  };

  // 快速切换卡片尺寸
  const rotateSize = (catId: string, link: LinkItem) => {
      const sizes: LinkItem['size'][] = ['small', 'medium', 'large'];
      const currentIdx = sizes.indexOf(link.size || 'small');
      const nextSize = sizes[(currentIdx + 1) % sizes.length];
      
      const newCats = categories.map(c => {
          if (c.id !== catId) return c;
          return { ...c, links: c.links.map(l => l.id === link.id ? { ...l, size: nextSize } : l) };
      });
      onSaveData(newCats);
  };

  return (
      <div className="space-y-8 animate-fade-in text-slate-100 pb-20">
          {categories.map((category, idx) => (
              <div key={category.id} className={cn("rounded-2xl border p-6 shadow-sm transition-colors", category.isPrivate ? "bg-amber-950/10 border-amber-500/20" : "bg-slate-900/50 border-slate-800")}>
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", category.isPrivate ? "bg-amber-900/20 text-amber-500" : "bg-cyan-900/20 text-cyan-400")}>
                              <Icon name={category.icon} size={20}/>
                          </div>
                          <input 
                            value={category.title} 
                            onChange={(e) => { const n = [...categories]; n[idx].title = e.target.value; setCategories(n); }} 
                            onBlur={() => onSaveData(categories)}
                            className="text-lg font-bold bg-transparent outline-none border-b border-transparent focus:border-cyan-500 w-40 text-slate-100"
                          />
                          {category.id !== COMMON_REC_ID && (
                              <button 
                                onClick={() => toggleCatPrivacy(idx)} 
                                className={cn("p-1.5 rounded-lg transition-colors ml-2", category.isPrivate ? "text-amber-400 bg-amber-900/20 hover:bg-amber-900/40" : "text-slate-600 hover:text-slate-400")}
                                title={category.isPrivate ? "私有分类" : "公开分类"}
                              >
                                {category.isPrivate ? <Lock size={14}/> : <Unlock size={14}/>}
                              </button>
                          )}
                      </div>
                      {category.id !== COMMON_REC_ID && (
                          <div className="flex items-center gap-2">
                              <button onClick={() => onOpenGenModal(category.id, category.title)} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-900/30 text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-900/50 transition-colors border border-cyan-500/20"><Wand2 size={14}/> AI 填充</button>
                              <button onClick={() => { const n = [...categories]; [n[idx], n[idx-1]] = [n[idx-1], n[idx]]; onSaveData(n); }} disabled={idx <= 1} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded disabled:opacity-30" aria-label="上移分类"><ChevronUp size={16}/></button>
                              <button onClick={() => { const n = [...categories]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; onSaveData(n); }} disabled={idx === categories.length-1} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded disabled:opacity-30" aria-label="下移分类"><ChevronDown size={16}/></button>
                              <button onClick={() => onDeleteCategory(category)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded" aria-label="删除分类"><Trash2 size={16}/></button>
                          </div>
                      )}
                  </div>
                  <div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min grid-flow-dense"
                    onDragOver={onDragOver}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (category.id !== COMMON_REC_ID && draggedItem) {
                            onDrop(e, category.id, category.links.length);
                        }
                    }}
                  >
                      {category.links.map((link, linkIndex) => (
                          <div 
                            key={link.id} 
                            draggable={category.id !== COMMON_REC_ID}
                            onDragStart={(e) => onDragStart(e, category.id, linkIndex)}
                            onDragOver={onDragOver}
                            onDrop={(e) => {
                                e.stopPropagation(); 
                                onDrop(e, category.id, linkIndex);
                            }}
                            className={cn(
                                "group relative p-4 rounded-xl border flex items-start gap-3 transition-all cursor-move",
                                "bg-slate-950 border-slate-800 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-900/10",
                                getSizeClasses(link.size),
                                link.isPrivate ? "bg-amber-950/10 border-amber-500/20" : "",
                                draggedItem?.catId === category.id && draggedItem?.index === linkIndex ? "opacity-30 border-dashed border-cyan-500" : ""
                            )}
                          >
                              <Favicon url={link.url} size={32} className="rounded-lg shadow-sm" onLoadError={() => setBrokenLinks(p => new Set(p).add(link.id))}/>
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate text-slate-200 flex items-center gap-1">
                                      {link.title}
                                      {link.isPrivate && <Lock size={12} className="text-amber-500"/>}
                                  </div>
                                  <div className={cn("text-xs text-slate-500 mt-0.5", link.size === 'large' ? "line-clamp-4" : "truncate")}>{link.description}</div>
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-1 rounded border border-slate-800 shadow-sm z-20">
                                  <button onClick={() => rotateSize(category.id, link)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded" title="切换尺寸"><Scaling size={12}/></button>
                                  <button onClick={() => onEditLink(category.id, link)} className="p-1 text-cyan-400 hover:bg-cyan-900/30 rounded" aria-label="编辑链接"><Edit size={12}/></button>
                                  <button onClick={() => onDeleteLink(category.id, link.id)} className="p-1 text-red-400 hover:bg-red-900/30 rounded" aria-label="删除链接"><Trash2 size={12}/></button>
                              </div>
                              {/* 尺寸指示器 */}
                              {link.size && link.size !== 'small' && (
                                  <div className="absolute bottom-2 right-2 text-[10px] text-slate-600 font-mono px-1 rounded bg-slate-900/50 border border-slate-800">{link.size === 'medium' ? '2x1' : '2x2'}</div>
                              )}
                          </div>
                      ))}
                      {category.id !== COMMON_REC_ID && <button onClick={() => onEditLink(category.id)} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-950/20 transition-all min-h-[80px]"><Plus size={20}/><span className="text-xs font-bold">添加链接</span></button>}
                  </div>
              </div>
          ))}
          <button onClick={onOpenAddCat} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 font-bold hover:border-cyan-500 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"><Plus size={20}/> 添加新分类</button>
      </div>
  );
};
