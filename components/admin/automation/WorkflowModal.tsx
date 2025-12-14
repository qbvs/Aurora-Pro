
import React, { useState, useEffect } from 'react';
import { Workflow as WorkflowIcon, Plus, Trash2, Globe, Copy, Clock, Play } from 'lucide-react';
import { Modal } from '../../Modal';
import { Workflow, WorkflowAction } from '../../../types';
import { cn } from '../../../utils';
import { Icon } from '../../Icon';

interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<Workflow>;
  onSave: (workflow: Workflow) => void;
}

export const WorkflowModal: React.FC<WorkflowModalProps> = ({ isOpen, onClose, initialData, onSave }) => {
  const [form, setForm] = useState<Partial<Workflow>>({ actions: [] });
  const [activeTab, setActiveTab] = useState<'info' | 'actions'>('info');

  useEffect(() => {
      setForm(initialData.id ? JSON.parse(JSON.stringify(initialData)) : { id: `wf-${Date.now()}`, name: '', icon: 'Play', actions: [] });
      setActiveTab('info');
  }, [initialData, isOpen]);

  const addAction = (type: WorkflowAction['type']) => {
      const newAction: WorkflowAction = {
          id: `act-${Date.now()}`,
          type,
          value: '',
          delay: 0
      };
      setForm(prev => ({ ...prev, actions: [...(prev.actions || []), newAction] }));
  };

  const updateAction = (id: string, field: keyof WorkflowAction, val: any) => {
      setForm(prev => ({
          ...prev,
          actions: prev.actions?.map(a => a.id === id ? { ...a, [field]: val } : a)
      }));
  };

  const removeAction = (id: string) => {
      setForm(prev => ({ ...prev, actions: prev.actions?.filter(a => a.id !== id) }));
  };

  const handleSave = () => {
      if (!form.name) return;
      onSave(form as Workflow);
      onClose();
  };

  if (!isOpen) return null;

  return (
      <Modal title={initialData.id ? '编辑工作流' : '创建工作流'} onClose={onClose} icon={<WorkflowIcon className="text-purple-400"/>}>
          <div className="p-6 space-y-6 text-slate-200">
              {/* Tabs */}
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setActiveTab('info')} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'info' ? "bg-slate-800 text-purple-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}>基本信息</button>
                  <button onClick={() => setActiveTab('actions')} className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'actions' ? "bg-slate-800 text-purple-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}>动作序列 ({form.actions?.length})</button>
              </div>

              {activeTab === 'info' && (
                  <div className="space-y-4 animate-fade-in">
                      <div>
                          <label className="block text-sm font-bold text-slate-400 mb-2">名称</label>
                          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-purple-500" placeholder="例如: 早安模式"/>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-400 mb-2">图标 (Lucide)</label>
                          <div className="flex gap-2">
                              <input value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-purple-500"/>
                              <div className="w-12 flex items-center justify-center bg-slate-800 rounded-xl"><Icon name={form.icon || 'Play'} /></div>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-400 mb-2">描述</label>
                          <input value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-purple-500" placeholder="简短描述该工作流的作用"/>
                      </div>
                  </div>
              )}

              {activeTab === 'actions' && (
                  <div className="space-y-4 animate-fade-in">
                      <div className="flex gap-2 mb-4">
                          <button onClick={() => addAction('open_url')} className="flex-1 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"><Globe size={14}/> 打开网页</button>
                          <button onClick={() => addAction('copy_text')} className="flex-1 py-2 bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"><Copy size={14}/> 复制文本</button>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                          {form.actions?.length === 0 && <div className="text-center text-slate-500 py-8 italic">暂无动作，请添加</div>}
                          {form.actions?.map((action, idx) => (
                              <div key={action.id} className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 flex gap-3 items-start group">
                                  <div className="mt-2 text-xs font-mono text-slate-600 w-4">{idx + 1}.</div>
                                  <div className="flex-1 space-y-2">
                                      <div className="flex items-center justify-between">
                                          <div className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 inline-block">
                                              {action.type === 'open_url' ? '打开网页' : '复制文本'}
                                          </div>
                                          <button onClick={() => removeAction(action.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
                                      </div>
                                      <input 
                                          value={action.value} 
                                          onChange={e => updateAction(action.id, 'value', e.target.value)}
                                          onBlur={() => {
                                              if (action.type === 'open_url' && action.value && !/^https?:\/\//i.test(action.value)) {
                                                  updateAction(action.id, 'value', 'https://' + action.value);
                                              }
                                          }}
                                          placeholder={action.type === 'open_url' ? 'https://example.com' : '要复制的内容...'}
                                          className="w-full p-2 text-sm bg-slate-950 rounded-lg border border-slate-800 outline-none focus:border-purple-500 font-mono"
                                      />
                                      <div className="flex items-center gap-2">
                                          <Clock size={12} className="text-slate-500"/>
                                          <span className="text-xs text-slate-500">延迟:</span>
                                          <input 
                                              type="number"
                                              value={action.delay}
                                              onChange={e => updateAction(action.id, 'delay', parseInt(e.target.value))}
                                              className="w-16 p-1 text-xs bg-slate-950 rounded border border-slate-800 outline-none text-center"
                                          />
                                          <span className="text-xs text-slate-500">ms</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              <button onClick={handleSave} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20">保存工作流</button>
          </div>
      </Modal>
  );
};
