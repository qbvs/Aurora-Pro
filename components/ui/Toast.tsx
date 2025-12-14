
import React from 'react';
import { AlertCircle, CircleCheck, Activity, X, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils';

export interface ToastMsg { 
  id: number; 
  type: 'success' | 'error' | 'info' | 'warn'; 
  msg: string; 
}

interface ToastContainerProps { 
  toasts: ToastMsg[]; 
  remove: (id: number) => void; 
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, remove }) => (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className={cn("pointer-events-auto min-w-[300px] p-4 rounded-2xl shadow-lg border backdrop-blur-xl animate-fade-in flex items-center gap-3", 
                t.type === 'error' ? "bg-red-950/80 border-red-500/30 text-red-200" : 
                t.type === 'success' ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200" :
                t.type === 'warn' ? "bg-amber-950/80 border-amber-500/30 text-amber-200" :
                "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-200"
            )}>
                {t.type === 'error' ? <AlertCircle size={20} className="text-red-400"/> : 
                 t.type === 'success' ? <CircleCheck size={20} className="text-emerald-400"/> : 
                 t.type === 'warn' ? <AlertTriangle size={20} className="text-amber-400"/> :
                 <Activity size={20} className="text-blue-400"/>}
                <span className="text-sm font-medium flex-1">{t.msg}</span>
                <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100 transition-opacity"><X size={16}/></button>
            </div>
        ))}
    </div>
);
