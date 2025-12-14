
import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Wand2 } from 'lucide-react';
import { Modal } from '../../Modal';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { LinkItem } from '../../../types';
import { analyzeUrl } from '../../../services/geminiService';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<LinkItem>;
  onSave: (link: Partial<LinkItem>) => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({ isOpen, onClose, initialData, onSave, addToast }) => {
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
      setLinkForm(initialData);
  }, [initialData, isOpen]);

  const handleAiFillLink = async () => { 
      if (!linkForm.url) return; 
      setIsAiLoading(true); 
      try { 
          const result = await analyzeUrl(linkForm.url); 
          setLinkForm(prev => ({ ...prev, title: result.title, description: result.description, pros: result.pros, cons: result.cons, color: result.brandColor, language: result.language })); 
          addToast('success', 'AI 链接分析完成'); 
      } catch (e: any) { 
          addToast('error', 'AI 分析失败: ' + e.message); 
      } finally { 
          setIsAiLoading(false); 
      } 
  };

  const handleSave = () => {
      onSave(linkForm);
      onClose();
  };

  if (!isOpen) return null;

  return (
      <Modal title={initialData.id ? '编辑链接' : '添加链接'} onClose={onClose} icon={<LinkIcon className="text-blue-400"/>}>
          <div className="p-6 space-y-4 text-slate-200">
               <div className="flex gap-2">
                   <input placeholder="URL (https://...)" value={linkForm.url || ''} onChange={(e) => setLinkForm({...linkForm, url: e.target.value})} className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
                   <button onClick={handleAiFillLink} disabled={isAiLoading} className="px-4 bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded-xl font-bold hover:bg-cyan-900/50 flex items-center gap-2 text-sm">
                       {isAiLoading ? <LoadingSpinner/> : <Wand2 size={16}/>} 智能识别
                   </button>
               </div>
               <input placeholder="标题" value={linkForm.title || ''} onChange={(e) => setLinkForm({...linkForm, title: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
               <input placeholder="描述" value={linkForm.description || ''} onChange={(e) => setLinkForm({...linkForm, description: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
               <div className="grid grid-cols-3 gap-4">
                   <input placeholder="优点 (短标签)" value={linkForm.pros || ''} onChange={(e) => setLinkForm({...linkForm, pros: e.target.value})} className="p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
                   <input placeholder="缺点 (短标签)" value={linkForm.cons || ''} onChange={(e) => setLinkForm({...linkForm, cons: e.target.value})} className="p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
                   <input placeholder="语言 (如: 中文)" value={linkForm.language || ''} onChange={(e) => setLinkForm({...linkForm, language: e.target.value})} className="p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/>
               </div>
               <button onClick={handleSave} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500">保存</button>
          </div>
      </Modal>
  );
};
