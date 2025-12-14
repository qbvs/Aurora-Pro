
import React, { useState, useEffect } from 'react';
import { Wand2 } from 'lucide-react';
import { Modal } from '../../Modal';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { generateCategoryLinks } from '../../../services/geminiService';
import { Category, LinkItem } from '../../../types';
import { addLog } from '../../../services/logger';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: { id: string, title: string } | null;
  categories: Category[];
  onSave: (newLinks: LinkItem[], catId: string) => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({ isOpen, onClose, category, categories, onSave, addToast }) => {
  const [genTopic, setGenTopic] = useState('');
  const [genCount, setGenCount] = useState(4);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);

  useEffect(() => {
      if (category) setGenTopic(category.title);
  }, [category]);

  const handleGenerate = async () => {
      if (!category) return;
      setIsGeneratingLinks(true);
      try {
          const allExistingUrls = new Set<string>(); 
          categories.forEach(cat => cat.links.forEach(link => allExistingUrls.add(link.url.toLowerCase().replace(/\/$/, "")))); 
          const existingInCat = categories.find(c => c.id === category.id)?.links.map(l => l.url) || []; 
          
          const newLinks = await generateCategoryLinks(genTopic || category.title, genCount, existingInCat); 
          const validLinks: LinkItem[] = []; 
          
          for (const l of newLinks) { 
              if (!l.url || !l.title) continue; 
              const normalizedUrl = l.url.toLowerCase().replace(/\/$/, ""); 
              if (allExistingUrls.has(normalizedUrl)) continue; 
              validLinks.push({ 
                  id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                  title: l.title, 
                  url: l.url, 
                  description: l.description || '', 
                  color: l.color || '#666', 
                  clickCount: 0, 
                  pros: l.pros, 
                  cons: l.cons, 
                  language: l.language
              }); 
              allExistingUrls.add(normalizedUrl); 
          } 
          
          if (validLinks.length === 0) { 
              addToast('error', "AI 未返回有效结果，请检查 API 配置或更换主题"); 
              return; 
          }
          
          onSave(validLinks, category.id);
          addToast('success', `成功添加了 ${validLinks.length} 个链接`);
          onClose();
      } catch (e: any) { 
          addToast('error', `生成失败: ${e.message}`); 
          addLog('error', `Generation failed: ${e.message}`);
      } finally { 
          setIsGeneratingLinks(false); 
      }
  };

  if (!isOpen || !category) return null;

  return (
      <Modal title={`AI 生成: ${category.title}`} onClose={onClose} icon={<Wand2 className="text-cyan-400"/>}>
           <div className="p-6 space-y-6">
               <div>
                   <label className="block text-sm font-bold text-slate-400 mb-2">生成主题</label>
                   <input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 text-white" placeholder="默认使用分类名称..."/>
               </div>
               <div>
                   <label className="block text-sm font-bold text-slate-400 mb-2">生成数量: {genCount}</label>
                   <input type="range" min="1" max="10" value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value))} className="w-full accent-cyan-500"/>
               </div>
               <button 
                   onClick={handleGenerate} 
                   disabled={isGeneratingLinks} 
                   className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                   {isGeneratingLinks ? <LoadingSpinner/> : <Wand2 size={18}/>}
                   {isGeneratingLinks ? '正在思考中...' : '开始生成'}
               </button>
           </div>
      </Modal>
  );
};
