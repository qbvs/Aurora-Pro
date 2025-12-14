
import React, { useState } from 'react';
import { Plus, Workflow as WorkflowIcon, Edit, Trash2, Play } from 'lucide-react';
import { Workflow, AppSettings } from '../../../types';
import { Icon } from '../../Icon';
import { WorkflowModal } from './WorkflowModal';

interface WorkflowManagerProps {
  workflows: Workflow[];
  onUpdateWorkflows: (workflows: Workflow[]) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warn', msg: string) => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({ workflows, onUpdateWorkflows, addToast }) => {
  const [editingWorkflow, setEditingWorkflow] = useState<Partial<Workflow> | null>(null);

  const handleSave = (wf: Workflow) => {
      const exists = workflows.find(w => w.id === wf.id);
      if (exists) {
          onUpdateWorkflows(workflows.map(w => w.id === wf.id ? wf : w));
          addToast('success', '工作流已更新');
      } else {
          onUpdateWorkflows([...workflows, wf]);
          addToast('success', '工作流已创建');
      }
      setEditingWorkflow(null);
  };

  const handleDelete = (id: string) => {
      if (confirm('确定删除此工作流吗？')) {
          onUpdateWorkflows(workflows.filter(w => w.id !== id));
          addToast('info', '工作流已删除');
      }
  };

  return (
      <div className="space-y-6 animate-fade-in text-slate-200">
          <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="text-2xl font-bold">自动化工作流</h2>
                  <p className="text-slate-500 text-sm mt-1">一键执行多步操作，提升效率</p>
              </div>
              <button onClick={() => setEditingWorkflow({})} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">
                  <Plus size={18}/> 新建工作流
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                      <WorkflowIcon size={48} className="mx-auto mb-4 opacity-50"/>
                      <p>暂无工作流，创建一个试试？</p>
                  </div>
              )}
              {workflows.map(wf => (
                  <div key={wf.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-purple-500/30 transition-all group relative overflow-hidden">
                      <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-purple-400 border border-slate-700">
                              <Icon name={wf.icon} size={20}/>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingWorkflow(wf)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><Edit size={16}/></button>
                              <button onClick={() => handleDelete(wf.id)} className="p-2 hover:bg-slate-700 rounded-lg text-red-400"><Trash2 size={16}/></button>
                          </div>
                      </div>
                      <h3 className="font-bold text-lg mb-1 relative z-10">{wf.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 h-8 relative z-10">{wf.description || '无描述'}</p>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-600 relative z-10">
                          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">{wf.actions.length} 动作</span>
                          {wf.trigger && <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">{wf.trigger}</span>}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </div>
              ))}
          </div>

          {editingWorkflow && (
              <WorkflowModal 
                  isOpen={true} 
                  onClose={() => setEditingWorkflow(null)} 
                  initialData={editingWorkflow} 
                  onSave={handleSave}
              />
          )}
      </div>
  );
};
