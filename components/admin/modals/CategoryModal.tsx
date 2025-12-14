
import React, { useState } from 'react';
import { Plus, Wand2, Lock, Eye } from 'lucide-react';
import { Modal } from '../../Modal';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { suggestIcon } from '../../../services/geminiService';
import { Category } from '../../../types';
import { cn } from '../../../utils';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Category) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warn', msg: string) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, addToast }) => {
  const [newCatName, setNewCatName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const handleCreateCategory = async () => {
      if (!newCatName.trim()) return;
      setIsCreatingCat(true);
      try {
          const iconName = await suggestIcon(newCatName);
          const newCat: Category = {
              id: `cat-${Date.now()}`,
              title: newCatName,
              icon: iconName,
              links: [],
              isPrivate: isPrivate // 保存隐私状态
          };
          onSave(newCat);
          setNewCatName('');
          setIsPrivate(false);
          addToast('success', `分类 "${newCatName}" 创建成功`);
          onClose();
      } catch (e) {
          onSave({ id: `cat-${Date.now()}`, title: newCatName, icon: 'Folder', links: [], isPrivate: isPrivate });
          setNewCatName('');
          setIsPrivate(false);
          onClose();
      } finally {
          setIsCreatingCat(false);
      }
  };

  if (!isOpen) return null;

  return (
    <Modal title="创建新分类" onClose={onClose} icon={<Plus className="text-cyan-400"/>}>
        <div className="p-6 space-y-6">
            <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">分类名称</label>
                <input 
                    autoFocus
                    value={newCatName} 
                    onChange={(e) => setNewCatName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 text-white placeholder:text-slate-600" 
                    placeholder="例如: 电影、设计、阅读..."
                />
            </div>

            {/* 隐私模式切换 */}
            <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                    {isPrivate ? <Lock size={16} className="text-amber-400"/> : <Eye size={16} className="text-slate-400"/>}
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-300">设为私有分类</span>
                        <span className="text-[10px] text-slate-500">分类及其下的所有链接将仅管理员可见</span>
                    </div>
                </div>
                <button 
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={cn("w-12 h-6 rounded-full relative transition-colors", isPrivate ? "bg-amber-600" : "bg-slate-700")}
                >
                    <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", isPrivate ? "left-7" : "left-1")}/>
                </button>
            </div>

            <button 
                onClick={handleCreateCategory} 
                disabled={isCreatingCat || !newCatName.trim()} 
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isCreatingCat ? <LoadingSpinner/> : <Wand2 size={18}/>}
                {isCreatingCat ? '正在匹配图标...' : '创建分类'}
            </button>
        </div>
    </Modal>
  );
};
