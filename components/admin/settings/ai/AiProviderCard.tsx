
import React from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { AIProviderConfig } from '../../../../types';
import { cn } from '../../../../utils';

interface Props {
    config: AIProviderConfig;
    onEdit: (c: AIProviderConfig) => void;
    onDelete: (id: string) => void;
}

export const AiProviderCard: React.FC<Props> = ({ config, onEdit, onDelete }) => (
    <div className={cn("p-5 rounded-2xl border transition-all flex flex-col gap-3 group relative overflow-hidden", config.isActive ? "bg-cyan-900/10 border-cyan-500/30" : "bg-slate-900/50 border-slate-800")}>
        <div className="flex justify-between items-start z-10">
            <div className="flex items-center gap-2">
                 <div className={cn("w-2 h-2 rounded-full", config.isActive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-slate-600")}/>
                 <span className="text-xs font-mono text-slate-500">{config.type === 'google' ? 'GEMINI' : 'OPENAI'}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(config)} className="p-1.5 hover:bg-slate-700 rounded text-cyan-400"><Settings size={16}/></button>
                <button onClick={() => onDelete(config.id)} className="p-1.5 hover:bg-slate-700 rounded text-red-400"><Trash2 size={16}/></button>
            </div>
        </div>
        <h3 className="text-lg font-bold text-white z-10 truncate">{config.name}</h3>
        <div className="text-xs text-slate-500 font-mono bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 z-10 truncate">{config.model}</div>
        {config.isActive && <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none"/>}
    </div>
);
