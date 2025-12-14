
import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Wand2, Lock, Eye, LayoutGrid, Square, RectangleHorizontal, Grid2X2 } from 'lucide-react';
import { Modal } from '../../Modal';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { LinkItem } from '../../../types';
import { analyzeUrl } from '../../../services/geminiService';
import { cn } from '../../../utils';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<LinkItem>;
  onSave: (link: Partial<LinkItem>) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warn', msg: string) => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({ isOpen, onClose, initialData, onSave, addToast }) => {
  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
      setLinkForm({ ...initialData, size: initialData.size || 'small' });
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

  const sizeOptions = [
      { id: 'small', label: '标准', icon: Square, desc: '1x1' },
      { id: 'medium', label: '宽幅', icon: RectangleHorizontal, desc: '2x1' },
      { id: 'large', label: '大卡片', icon: Grid2X2, desc: '2x2' },
  ];

  if (!isOpen) return null;

  return (
      <Modal title={initialData.id ? '编辑链接' : '添加链接'} onClose={onClose} icon={<LinkIcon className="text-blue-400"/>}>
          <div className="p-6 space-y-5 text-slate-200">
               {/* URL 输入区 */}
               <div className="flex gap-2">
                   <input placeholder="URL (https://...)" value={linkForm.url || ''} onChange={(e) => setLinkForm({...linkForm, url: e.target.value})} className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 font-mono text-sm"/>
                   <button onClick={handleAiFillLink} disabled={isAiLoading} className="px-4 bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded-xl font-bold hover:bg-cyan-900/50 flex items-center gap-2 text-sm whitespace-nowrap">
                       {isAiLoading ? <LoadingSpinner/> : <Wand2 size={16}/>} 智能识别
                   </button>
               </div>
               
               {/* 基础信息 */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-4">
                       <input placeholder="标题" value={linkForm.title || ''} onChange={(e) => setLinkForm({...linkForm, title: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 font-bold"/>
                       <textarea rows={3} placeholder="描述" value={linkForm.description || ''} onChange={(e) => setLinkForm({...linkForm, description: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 resize-none text-sm"/>
                   </div>

                   <div className="space-y-4">
                       {/* 尺寸选择 */}
                       <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                           <label className="text-xs font-bold text-slate-400 mb-2 block flex items-center gap-1"><LayoutGrid size={12}/> 卡片尺寸</label>
                           <div className="grid grid-cols-3 gap-2">
                               {sizeOptions.map(opt => (
                                   <button 
                                       key={opt.id}
                                       onClick={() => setLinkForm({...linkForm, size: opt.id as any})}
                                       className={cn(
                                           "flex flex-col items-center justify-center p-2 rounded-lg border transition-all gap-1",
                                           linkForm.size === opt.id 
                                             ? "bg-cyan-600 text-white border-cyan-500 shadow-md" 
                                             : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                                       )}
                                   >
                                       <opt.icon size={18} />
                                       <span className="text-[10px] font-bold">{opt.desc}</span>
                                   </button>
                               ))}
                           </div>
                       </div>
                       
                       {/* 隐私模式 */}
                       <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-2">
                                {linkForm.isPrivate ? <Lock size={16} className="text-amber-400"/> : <Eye size={16} className="text-slate-400"/>}
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-300">隐私模式</span>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setLinkForm({...linkForm, isPrivate: !linkForm.isPrivate})}
                                className={cn("w-10 h-5 rounded-full relative transition-colors", linkForm.isPrivate ? "bg-amber-600" : "bg-slate-700")}
                            >
                                <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm", linkForm.isPrivate ? "left-6" : "left-1")}/>
                            </button>
                       </div>
                   </div>
               </div>

               {/* 标签与元数据 */}
               <div className="grid grid-cols-3 gap-3">
                   <input placeholder="优点 (短标签)" value={linkForm.pros || ''} onChange={(e) => setLinkForm({...linkForm, pros: e.target.value})} className="p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 text-sm"/>
                   <input placeholder="缺点 (短标签)" value={linkForm.cons || ''} onChange={(e) => setLinkForm({...linkForm, cons: e.target.value})} className="p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 text-sm"/>
                   <input placeholder="语言 (如: 中文)" value={linkForm.language || ''} onChange={(e) => setLinkForm({...linkForm, language: e.target.value})} className="p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 text-sm"/>
               </div>

               <button onClick={handleSave} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 shadow-lg shadow-cyan-900/20 active:scale-95 transition-transform">保存更改</button>
          </div>
      </Modal>
  );
};
