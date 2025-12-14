
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, MessageCircleQuestion, Compass, Send, 
  RotateCw, Plus, ArrowRight, Loader2, X 
} from 'lucide-react';
import { cn } from '../utils';
import { LinkItem } from '../types';
import { Favicon } from './Favicon';

interface AiCommandPanelProps {
  initialGreeting: string;
  onRefreshGreeting: () => Promise<string>;
  onAskQuestion: (q: string) => Promise<string>;
  onDiscoverSites: (topic: string) => Promise<Partial<LinkItem>[]>;
  onAddLink: (link: Partial<LinkItem>) => void;
}

type Mode = 'greeting' | 'input' | 'result';
type ResultType = 'text' | 'sites';

export const AiCommandPanel: React.FC<AiCommandPanelProps> = ({
  initialGreeting,
  onRefreshGreeting,
  onAskQuestion,
  onDiscoverSites,
}) => {
  const [greeting, setGreeting] = useState(initialGreeting);
  const [mode, setMode] = useState<Mode>('greeting');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Result state
  const [resultType, setResultType] = useState<ResultType>('text');
  const [textResult, setTextResult] = useState('');
  const [siteResults, setSiteResults] = useState<Partial<LinkItem>[]>([]);

  // Interaction state
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialGreeting) setGreeting(initialGreeting);
  }, [initialGreeting]);

  // Keep click outside as a backup, though mouseleave covers most cases now
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!isLoading && mode !== 'greeting') {
           setMode('greeting');
           setInputValue('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mode, isLoading]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const newText = await onRefreshGreeting();
      if (newText) setGreeting(newText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    setMode('result');
    setResultType('text');
    try {
      const ans = await onAskQuestion(inputValue);
      setTextResult(ans);
    } catch (e) {
      setTextResult("抱歉，AI 暂时无法回答这个问题。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscover = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    setMode('result');
    setResultType('sites');
    setSiteResults([]); 
    try {
      const sites = await onDiscoverSites(inputValue);
      setSiteResults(sites);
    } catch (e) {
      setTextResult("抱歉，未能找到相关网站。");
      setResultType('text'); // Fallback to text error
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMode('input');
    setInputValue('');
    setTextResult('');
    setSiteResults([]);
    // Focus input after reset
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleMouseLeave = () => {
    // If AI is thinking, keep it open so user sees status. 
    // Otherwise, immediately retract to greeting mode.
    if (!isLoading && mode !== 'greeting') {
        setMode('greeting');
        setInputValue(''); // Reset input to keep it fresh next time
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full transition-all duration-500 ease-out overflow-hidden group mb-12",
        // Styles moved from inner div to outer container to ensure correct clipping
        "rounded-3xl shadow-lg border border-white/50 dark:border-white/10",
        "bg-white/60 dark:bg-slate-900/40 backdrop-blur-md",
        // FIX: Ensure both greeting and input modes share the same fixed height (h-48) to prevent jumping.
        // Only expand to auto height when showing results.
        mode === 'result' ? "h-auto min-h-[192px]" : "h-48"
      )}
      onMouseEnter={() => {
        // Only switch to input mode if we are in greeting mode and not loading
        if (mode === 'greeting' && !isLoading) setMode('input');
      }}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Effects */}
      {/* Inner Glow Border */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/20 dark:ring-white/10 pointer-events-none" />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"/>
      {mode === 'result' && <div className="absolute inset-0 rounded-3xl bg-white/50 dark:bg-slate-950/50 transition-colors duration-500"/>}

      {/* Adjust padding: use px instead of p to avoid vertical padding blowing out the fixed height in input mode */}
      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center px-6 md:px-10 py-6">
        
        {/* --- 1. GREETING MODE --- */}
        <div 
            className={cn(
                "absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-all duration-500",
                mode === 'greeting' ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-4 pointer-events-none"
            )}
        >
            {/* Divider line will now be properly clipped by the parent's rounded-3xl */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"></div>
            <p className="text-2xl md:text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 leading-relaxed tracking-wide font-serif italic drop-shadow-sm">
              "{greeting}"
            </p>
            <div className="mt-6 flex justify-center gap-2">
                <span className="w-16 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"/>
            </div>
        </div>

        {/* --- 2. INPUT MODE --- */}
        <div 
            className={cn(
                "w-full max-w-2xl flex flex-col items-center gap-6 transition-all duration-500",
                mode === 'input' ? "opacity-100 translate-y-0 delay-75" : "opacity-0 translate-y-8 pointer-events-none absolute"
            )}
        >
            <div className="w-full relative group/input">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within/input:text-cyan-600 dark:group-focus-within/input:text-cyan-400 transition-colors">
                    <Sparkles size={20}/>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                         if (e.key === 'Enter') handleDiscover(); // Default action
                    }}
                    placeholder="输入问题或主题，例如：'推荐几个好用的配色网站'..."
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 dark:hover:border-white/20 focus:bg-white dark:focus:bg-slate-900 focus:border-cyan-500/50 shadow-inner focus:shadow-lg focus:shadow-cyan-500/10 outline-none text-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all text-center"
                    autoFocus={mode === 'input'}
                />
            </div>

            <div className="flex flex-wrap justify-center gap-4">
                 <button 
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-sm font-bold active:scale-95"
                 >
                    <RotateCw size={16} className={isLoading ? "animate-spin" : ""}/> 换一句
                 </button>
                 <button 
                    onClick={handleAsk}
                    disabled={!inputValue.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                 >
                    <MessageCircleQuestion size={16}/> 快速提问
                 </button>
                 <button 
                    onClick={handleDiscover}
                    disabled={!inputValue.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 hover:bg-cyan-100 dark:hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 shadow-sm dark:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                 >
                    <Compass size={16}/> 发现网站
                 </button>
            </div>
        </div>

        {/* --- 3. RESULT MODE --- */}
        <div 
             className={cn(
                "w-full transition-all duration-500 flex flex-col",
                mode === 'result' ? "opacity-100 translate-y-0 relative" : "opacity-0 translate-y-8 pointer-events-none absolute"
            )}
        >   
            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-4 text-cyan-600 dark:text-cyan-400">
                    <Loader2 size={32} className="animate-spin"/>
                    <span className="text-sm font-bold animate-pulse">AI 正在思考中...</span>
                </div>
            )}

            {/* Content State */}
            {!isLoading && (
                <div className="animate-fade-in w-full max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-bold">
                            <span className="bg-slate-200 dark:bg-white/10 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-300">Q</span>
                            <span>{inputValue}</span>
                        </div>
                        <button onClick={reset} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                            <X size={20}/>
                        </button>
                    </div>

                    {resultType === 'text' && (
                        <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 leading-relaxed text-lg shadow-inner">
                            {textResult}
                        </div>
                    )}

                    {resultType === 'sites' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {siteResults.map((site, idx) => {
                                return (
                                    <div key={idx} className="flex flex-col p-4 rounded-xl bg-white/50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/30 transition-all group/card shadow-sm">
                                        <div className="flex items-start justify-between mb-3">
                                            <Favicon url={site.url || ''} size={24} className="rounded-md"/>
                                        </div>
                                        <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 truncate">{site.title}</div>
                                        <div className="text-xs text-slate-500 line-clamp-2 mb-2 h-8">{site.description}</div>
                                        <div className="mt-auto flex items-center justify-between">
                                            {site.language && <span className="text-[10px] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-500">{site.language}</span>}
                                            <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-600 dark:text-slate-600 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1 transition-colors w-fit ml-auto">
                                                访问 <ArrowRight size={10}/>
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    <div className="mt-6 flex justify-center">
                         <button onClick={reset} className="text-sm font-bold text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-2">
                            继续提问 <ArrowRight size={14}/>
                         </button>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
