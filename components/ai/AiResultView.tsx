
import React from 'react';
import { Loader2, X, ArrowRight } from 'lucide-react';
import { LinkItem } from '../../types';
import { Favicon } from '../Favicon';
import { cn } from '../../utils';

interface Props {
    isVisible: boolean;
    isLoading: boolean;
    resultType: 'text' | 'sites';
    textResult: string;
    siteResults: Partial<LinkItem>[];
    question: string;
    onReset: () => void;
}

// 结果展示层：处理文本回答和网站卡片网格
export const AiResultView: React.FC<Props> = ({ isVisible, isLoading, resultType, textResult, siteResults, question, onReset }) => (
    <div className={cn("w-full transition-all duration-500 flex flex-col", isVisible ? "opacity-100 translate-y-0 relative" : "opacity-0 translate-y-8 pointer-events-none absolute")}>
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-cyan-600 dark:text-cyan-400">
                <Loader2 size={32} className="animate-spin"/>
                <span className="text-sm font-bold animate-pulse">AI 正在思考中...</span>
            </div>
        ) : (
            <div className="animate-fade-in w-full max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-bold">
                        <span className="bg-slate-200 dark:bg-white/10 px-3 py-1 rounded-lg">Q</span>
                        <span>{question}</span>
                    </div>
                    <button onClick={onReset} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full"><X size={20}/></button>
                </div>
                {resultType === 'text' && (
                    <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 leading-relaxed text-lg shadow-inner">{textResult}</div>
                )}
                {resultType === 'sites' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {siteResults.map((site, idx) => (
                            <div key={idx} className="flex flex-col p-4 rounded-xl bg-white/50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/30 transition-all shadow-sm">
                                <div className="mb-3"><Favicon url={site.url || ''} size={24} className="rounded-md"/></div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 truncate">{site.title}</div>
                                <div className="text-xs text-slate-500 line-clamp-2 mb-2 h-8">{site.description}</div>
                                <a href={site.url} target="_blank" className="text-[10px] text-slate-600 hover:text-cyan-600 flex items-center gap-1 mt-auto ml-auto">访问 <ArrowRight size={10}/></a>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-6 flex justify-center"><button onClick={onReset} className="text-sm font-bold text-slate-500 hover:text-cyan-600 flex items-center gap-2">继续提问 <ArrowRight size={14}/></button></div>
            </div>
        )}
    </div>
);
