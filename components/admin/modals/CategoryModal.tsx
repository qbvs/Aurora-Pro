
import React, { useState } from 'react';
import { Plus, Wand2 } from 'lucide-react';
import { Modal } from '../../Modal';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { suggestIcon } from '../../../services/geminiService';
import { Category } from '../../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Category) => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, addToast }) => {
  const [newCatName, setNewCatName] = useState('');
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
              links: []
          };
          onSave(newCat);
          setNewCatName('');
          addToast('success', `分类 "${newCatName}" 创建成功`);
          onClose();
      } catch (e) {
          onSave({ id: `cat-${Date.now()}`, title: newCatName, icon: 'Folder', links: [] });
          setNewCatName('');
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
                <p className="mt-2 text-xs text-slate-500">AI 将根据名称自动匹配合适的图标。</p>
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
