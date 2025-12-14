
import React from 'react';
import { cn } from '../../utils';

interface Props {
    greeting: string;
    isVisible: boolean;
}

// 展示 AI 生成的每日问候语
export const AiGreetingView: React.FC<Props> = ({ greeting, isVisible }) => (
    <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-all duration-500",
        isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-4 pointer-events-none"
    )}>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"/>
        <p className="text-2xl md:text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 leading-relaxed tracking-wide font-serif italic drop-shadow-sm">
          "{greeting}"
        </p>
        <div className="mt-6 flex justify-center gap-2">
            <span className="w-16 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"/>
        </div>
    </div>
);
