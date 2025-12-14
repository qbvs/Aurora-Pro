
import React from 'react';
import { WidgetConfig, WidgetType } from '../../../types';
import { Clock, CloudSun, CheckSquare, Calendar, Plus, Trash2, LayoutTemplate } from 'lucide-react';
import { cn } from '../../../utils';

interface WidgetManagerProps {
  widgets: WidgetConfig[];
  onUpdateWidgets: (widgets: WidgetConfig[]) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warn', msg: string) => void;
}

const WIDGET_TYPES: { type: WidgetType; label: string; icon: React.ElementType; defaultW: number }[] = [
    { type: 'clock', label: '数字时钟', icon: Clock, defaultW: 1 },
    { type: 'weather', label: '天气卡片', icon: CloudSun, defaultW: 1 },
    { type: 'todo', label: '待办清单', icon: CheckSquare, defaultW: 2 },
    { type: 'calendar', label: '日历', icon: Calendar, defaultW: 1 },
];

export const WidgetManager: React.FC<WidgetManagerProps> = ({ widgets, onUpdateWidgets, addToast }) => {
  
  const handleAdd = (typeObj: typeof WIDGET_TYPES[0]) => {
      const newWidget: WidgetConfig = {
          id: `w-${Date.now()}`,
          type: typeObj.type,
          title: typeObj.label,
          w: typeObj.defaultW,
          h: 1
      };
      onUpdateWidgets([...widgets, newWidget]);
      addToast('success', `已添加 ${typeObj.label}`);
  };

  const handleRemove = (id: string) => {
      onUpdateWidgets(widgets.filter(w => w.id !== id));
  };

  const handleResize = (id: string, width: number) => {
      onUpdateWidgets(widgets.map(w => w.id === id ? { ...w, w: width } : w));
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-200">
        <h2 className="text-2xl font-bold">小部件管理</h2>
        
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-slate-400 mb-4 flex items-center gap-2"><Plus size={18}/> 添加到仪表盘</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {WIDGET_TYPES.map(t => (
                    <button key={t.type} onClick={() => handleAdd(t)} className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all group">
                        <div className="p-3 bg-slate-900 rounded-full group-hover:bg-cyan-500 group-hover:text-white transition-colors text-slate-500">
                            <t.icon size={24}/>
                        </div>
                        <span className="font-bold text-sm">{t.label}</span>
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="font-bold text-slate-400 mb-4 flex items-center gap-2"><LayoutTemplate size={18}/> 已启用的小部件 ({widgets.length})</h3>
            {widgets.length === 0 && <div className="text-slate-600 italic">暂无小部件，请从上方添加。</div>}
            {widgets.map((widget, idx) => (
                <div key={widget.id} className="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div className="p-2 bg-slate-950 rounded-lg text-slate-400">
                        {React.createElement(WIDGET_TYPES.find(t => t.type === widget.type)?.icon || Clock, { size: 20 })}
                    </div>
                    <div className="flex-1">
                        <input 
                            value={widget.title} 
                            onChange={(e) => onUpdateWidgets(widgets.map((w, i) => i === idx ? { ...w, title: e.target.value } : w))}
                            className="bg-transparent font-bold text-slate-200 outline-none border-b border-transparent focus:border-cyan-500 w-full"
                        />
                        <div className="text-xs text-slate-500 mt-1">类型: {widget.type}</div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 border border-slate-800">
                        <button onClick={() => handleResize(widget.id, 1)} className={cn("px-2 py-1 text-xs rounded font-bold transition-colors", widget.w === 1 ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>1x</button>
                        <button onClick={() => handleResize(widget.id, 2)} className={cn("px-2 py-1 text-xs rounded font-bold transition-colors", widget.w === 2 ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>2x</button>
                        <button onClick={() => handleResize(widget.id, 4)} className={cn("px-2 py-1 text-xs rounded font-bold transition-colors", widget.w === 4 ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>4x</button>
                    </div>
                    <button onClick={() => handleRemove(widget.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18}/></button>
                </div>
            ))}
        </div>
    </div>
  );
};
