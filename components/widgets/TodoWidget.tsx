
import React, { useState } from 'react';
import { WidgetBase } from './WidgetBase';
import { Plus, Check, Trash } from 'lucide-react';
import { cn } from '../../utils';

interface TodoItem {
    id: string;
    text: string;
    done: boolean;
}

export const TodoWidget: React.FC<any> = ({ data, onUpdate, ...props }) => {
  const [inputValue, setInputValue] = useState('');
  const todos: TodoItem[] = data?.todos || [];

  const handleAdd = () => {
      if (!inputValue.trim()) return;
      const newTodos = [...todos, { id: Date.now().toString(), text: inputValue, done: false }];
      onUpdate({ todos: newTodos });
      setInputValue('');
  };

  const toggleTodo = (id: string) => {
      const newTodos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
      onUpdate({ todos: newTodos });
  };

  const removeTodo = (id: string) => {
      const newTodos = todos.filter(t => t.id !== id);
      onUpdate({ todos: newTodos });
  };

  return (
    <WidgetBase {...props} title="待办事项" className="min-h-[200px] overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-3 pr-1">
            {todos.length === 0 && <div className="text-center text-xs text-slate-400 py-4">暂无待办，享受生活吧 🎉</div>}
            {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-2 group">
                    <button 
                        onClick={() => toggleTodo(todo.id)}
                        className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                            todo.done ? "bg-cyan-500 border-cyan-500 text-white" : "border-slate-300 dark:border-slate-600 hover:border-cyan-500"
                        )}
                    >
                        {todo.done && <Check size={12} strokeWidth={4}/>}
                    </button>
                    <span className={cn("flex-1 text-sm truncate", todo.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200")}>{todo.text}</span>
                    <button onClick={() => removeTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity"><Trash size={14}/></button>
                </div>
            ))}
        </div>
        <div className="flex gap-2 shrink-0">
            <input 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="flex-1 bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all border border-transparent dark:border-white/5"
                placeholder="添加新任务..."
            />
            <button onClick={handleAdd} className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"><Plus size={18}/></button>
        </div>
    </WidgetBase>
  );
};
