
import React, { useState, useEffect } from 'react';
import { WidgetBase } from './WidgetBase';

export const ClockWidget: React.FC<any> = (props) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <WidgetBase {...props} className="min-h-[140px] justify-center items-center text-center">
      <div className="text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tighter">
        {String(time.getHours()).padStart(2, '0')}
        <span className="animate-pulse text-cyan-500">:</span>
        {String(time.getMinutes()).padStart(2, '0')}
      </div>
      <div className="text-sm font-medium text-slate-400 mt-2">
         {time.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </WidgetBase>
  );
};
