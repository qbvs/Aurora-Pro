
import React from 'react';
import { WidgetBase } from './WidgetBase';
import { cn } from '../../utils';

export const CalendarWidget: React.FC<any> = (props) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <WidgetBase {...props} title={`${currentYear}年 ${currentMonth + 1}月`} className="min-h-[200px]">
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-bold">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs flex-1">
            {padding.map(i => <div key={`pad-${i}`}/>)}
            {days.map(d => {
                const isToday = d === today.getDate();
                return (
                    <div key={d} className={cn(
                        "aspect-square flex items-center justify-center rounded-lg font-medium",
                        isToday ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                    )}>
                        {d}
                    </div>
                );
            })}
        </div>
    </WidgetBase>
  );
};
