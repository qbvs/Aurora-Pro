
import React, { useRef, useEffect } from 'react';
import { Sparkles, RotateCw, MessageCircleQuestion, Compass } from 'lucide-react';
import { cn } from '../../utils';

interface Props {
    isVisible: boolean;
    inputValue: string;
    setInputValue: (v: string) => void;
    isLoading: boolean;
    onRefresh: (e: React.MouseEvent) => void;
    onAsk: () => void;
    onDiscover: () => void;
}

// AI 交互面板：输入框和操作按钮
export const AiInputView: React.FC<Props> = ({ isVisible, inputValue, setInputValue, isLoading, onRefresh, onAsk, onDiscover }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (isVisible) inputRef.current?.focus(); }, [isVisible]);

    return (
        <div className={cn("w-full max-w-2xl flex flex-col items-center gap-6 transition-all duration-500", isVisible ? "opacity-100 translate-y-0 delay-75" : "opacity-0 translate-y-8 pointer-events-none absolute")}>
            <div className="w-full relative group/input">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within/input:text-cyan-600 dark:group-focus-within/input:text-cyan-400 transition-colors">
                    <Sparkles size={20}/>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onDiscover()}
                    placeholder="输入问题或主题，例如：'推荐几个好用的配色网站'..."
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 focus:border-cyan-500/50 shadow-inner focus:shadow-lg focus:shadow-cyan-500/10 outline-none text-lg text-slate-800 dark:text-slate-200 text-center transition-all"
                />
            </div>
            <div className="flex flex-wrap justify-center gap-4">
                 <button onClick={onRefresh} className="btn-secondary"><RotateCw size={16} className={isLoading ? "animate-spin" : ""}/> 换一句</button>
                 <button onClick={onAsk} disabled={!inputValue.trim()} className="btn-primary-soft"><MessageCircleQuestion size={16}/> 快速提问</button>
                 <button onClick={onDiscover} disabled={!inputValue.trim()} className="btn-cyan"><Compass size={16}/> 发现网站</button>
            </div>
        </div>
    );
};
