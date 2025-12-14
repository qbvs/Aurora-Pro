
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../utils';
import { LinkItem } from '../types';
import { AiGreetingView } from './ai/AiGreetingView';
import { AiInputView } from './ai/AiInputView';
import { AiResultView } from './ai/AiResultView';

interface Props {
  initialGreeting: string;
  onRefreshGreeting: () => Promise<string>;
  onAskQuestion: (q: string) => Promise<string>;
  onDiscoverSites: (topic: string) => Promise<Partial<LinkItem>[]>;
  onAddLink: (link: Partial<LinkItem>) => void;
}

type Mode = 'greeting' | 'input' | 'result';

export const AiCommandPanel: React.FC<Props> = ({ initialGreeting, onRefreshGreeting, onAskQuestion, onDiscoverSites }) => {
  const [greeting, setGreeting] = useState(initialGreeting);
  const [mode, setMode] = useState<Mode>('greeting');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [resultType, setResultType] = useState<'text' | 'sites'>('text');
  const [textResult, setTextResult] = useState('');
  const [siteResults, setSiteResults] = useState<Partial<LinkItem>[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (initialGreeting) setGreeting(initialGreeting); }, [initialGreeting]);

  // 交互逻辑：鼠标移出重置
  const handleMouseLeave = () => { if (!isLoading && mode !== 'greeting') { setMode('greeting'); setInputValue(''); } };

  // 业务逻辑：API调用封装
  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation(); setIsLoading(true);
    try { const t = await onRefreshGreeting(); if (t) setGreeting(t); } finally { setIsLoading(false); }
  };

  const handleAsk = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true); setMode('result'); setResultType('text');
    try { const ans = await onAskQuestion(inputValue); setTextResult(ans); } 
    catch { setTextResult("AI 暂时无法回答。"); } 
    finally { setIsLoading(false); }
  };

  const handleDiscover = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true); setMode('result'); setResultType('sites'); setSiteResults([]);
    try { const sites = await onDiscoverSites(inputValue); setSiteResults(sites); } 
    catch { setTextResult("未找到相关网站。"); setResultType('text'); } 
    finally { setIsLoading(false); }
  };

  const reset = () => { setMode('input'); setInputValue(''); setTextResult(''); setSiteResults([]); };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full transition-all duration-500 ease-out overflow-hidden group mb-12 rounded-3xl shadow-lg border border-white/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md",
        mode === 'result' ? "h-auto min-h-[192px]" : "h-48"
      )}
      onMouseEnter={() => { if (mode === 'greeting' && !isLoading) setMode('input'); }}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/20 pointer-events-none" />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"/>
      {mode === 'result' && <div className="absolute inset-0 rounded-3xl bg-white/50 dark:bg-slate-950/50 transition-colors duration-500"/>}

      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center px-6 md:px-10 py-6">
        <AiGreetingView greeting={greeting} isVisible={mode === 'greeting'} />
        <AiInputView 
            isVisible={mode === 'input'} 
            inputValue={inputValue} setInputValue={setInputValue} 
            isLoading={isLoading} onRefresh={handleRefresh} onAsk={handleAsk} onDiscover={handleDiscover}
        />
        <AiResultView 
            isVisible={mode === 'result'} isLoading={isLoading}
            resultType={resultType} textResult={textResult} siteResults={siteResults}
            question={inputValue} onReset={reset}
        />
      </div>
    </div>
  );
};
