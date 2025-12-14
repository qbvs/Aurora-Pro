
import React from 'react';
import { cn } from '../../utils';
import { Settings, Trash2 } from 'lucide-react';

interface WidgetBaseProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
  isEditMode?: boolean;
  onRemove?: () => void;
  colSpan?: number; // 1 | 2 | 4
}

export const WidgetBase: React.FC<WidgetBaseProps> = ({ 
  title, className, children, isEditMode, onRemove, colSpan = 1 
}) => {
  // 根据 colSpan 决定 Tailwind 的类名
  const colClass = colSpan === 2 ? 'md:col-span-2' : colSpan === 4 ? 'md:col-span-4' : 'md:col-span-1';

  return (
    <div className={cn(
      "relative rounded-3xl p-5 flex flex-col transition-all duration-300 overflow-hidden group",
      "bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-white/5 shadow-sm hover:shadow-lg hover:shadow-cyan-900/5",
      colClass,
      className
    )}>
      {title && (
        <div className="flex justify-between items-center mb-3 shrink-0">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
        </div>
      )}
      
      {isEditMode && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-20">
            <button onClick={onRemove} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                <Trash2 size={14}/>
            </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col relative z-10">
        {children}
      </div>
      
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"/>
    </div>
  );
};
