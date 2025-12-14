
import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Category, LinkItem, AppSettings } from '../../types';
import { Icon } from '../Icon';
import { Favicon } from '../Favicon';
import { cn } from '../../utils';

interface Props {
    categories: Category[];
    viewCategory: string | null;
    setViewCategory: (id: string) => void;
    handleLinkClick: (cat: Category, link: LinkItem) => void;
    settings: AppSettings;
    clickedLinkId: string | null;
}

const COMMON_REC_ID = 'rec-1';

// 负责渲染分类列表和链接卡片的核心组件
export const CategoryList: React.FC<Props> = ({ categories, viewCategory, setViewCategory, handleLinkClick, settings, clickedLinkId }) => {
    return (
        <div className="space-y-10 pb-32">
            {categories.map(cat => {
                const isCommon = cat.id === COMMON_REC_ID;
                const showAllLinks = !!viewCategory || isCommon;
                const displayLinks = showAllLinks ? cat.links : cat.links.slice(0, 3);
                const hasMore = !showAllLinks && cat.links.length > 3;

                return (
                    <section key={cat.id} id={cat.id} className="scroll-mt-36 animate-fade-in-up">
                        {/* 分类标题行 */}
                        <div className="flex items-center gap-4 mb-6 group cursor-pointer" onClick={() => !isCommon && !viewCategory && setViewCategory(cat.id)}>
                            <div className={cn("p-2.5 rounded-xl transition-all duration-300 border border-transparent", 
                                isCommon 
                                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" 
                                  : "bg-white/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-hover:bg-cyan-500 group-hover:text-white"
                            )}>
                                <Icon name={cat.icon} size={22}/>
                            </div>
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{cat.title}</h2>
                                <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-600">{cat.links.length}</span>
                            </div>
                            {!isCommon && !viewCategory && <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300 text-cyan-600 ml-auto"><ChevronRight size={18}/></div>}
                        </div>
                        
                        {/* 链接卡片网格 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                            {displayLinks.map((link) => (
                                <div 
                                  key={link.id} 
                                  className={cn(
                                      "group relative flex flex-col p-5 rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden ring-1 ring-transparent select-none",
                                      "bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-white/5 shadow-sm",
                                      clickedLinkId === link.id 
                                          ? "animate-pop bg-cyan-500/10 border-cyan-500/30 ring-cyan-500/30" 
                                          : "hover:shadow-2xl hover:shadow-cyan-900/10 hover:scale-[1.02] hover:-translate-y-1 hover:ring-cyan-500/30"
                                  )} 
                                  style={{ opacity: settings.cardOpacity / 100 }}
                                  onClick={() => handleLinkClick(cat, link)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"/>
                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                        <div className="p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-inner group-hover:shadow-cyan-500/20 transition-all border border-slate-100 dark:border-white/5">
                                            <Favicon url={link.url} size={32} className="rounded-xl"/>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-cyan-500/20 flex items-center justify-center text-slate-400 group-hover:text-cyan-600 transition-all scale-90 group-hover:scale-100">
                                            <ArrowLeft size={16} className="rotate-135"/>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-[15px] truncate mb-1 relative z-10 group-hover:text-cyan-600 transition-colors">{link.title}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed relative z-10 transition-colors">{link.description}</p>
                                    
                                    {(link.pros || link.cons || link.language) && (
                                        <div className="mt-4 flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
                                            {link.language && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{link.language}</span>}
                                            {link.pros && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{link.pros}</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {hasMore && (
                                <button onClick={() => setViewCategory(cat.id)} className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white/30 dark:bg-white/[0.02] text-slate-400 hover:border-cyan-500/30 hover:text-cyan-600 hover:bg-cyan-500/5 transition-all group backdrop-blur-sm min-h-[140px]">
                                    <div className="w-12 h-12 rounded-full bg-white/50 dark:bg-white/5 group-hover:bg-cyan-500/10 shadow-sm flex items-center justify-center transition-all group-hover:scale-110">
                                        <ChevronRight size={24}/>
                                    </div>
                                    <span className="text-xs font-bold tracking-wide">查看全部 ({cat.links.length})</span>
                                </button>
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};
