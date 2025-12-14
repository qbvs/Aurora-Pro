
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { AppSettings, AIProviderConfig } from '../../../types';
import { AiProviderCard } from './ai/AiProviderCard';
import { AiConfigModal } from './ai/AiConfigModal';
import { testAiConnection } from '../../../services/geminiService';

interface AiSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warn', msg: string) => void;
}

export const AiSettings: React.FC<AiSettingsProps> = ({ settings, onUpdateSettings, addToast }) => {
  const [editingConfig, setEditingConfig] = useState<AIProviderConfig | null>(null);

  const handleAdd = () => { 
    const newConfig: AIProviderConfig = { 
        id: `ai-${Date.now()}`, name: '新模型', type: 'openai', 
        baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-3.5-turbo', isActive: false 
    }; 
    const newConfigs = [...settings.aiConfigs, newConfig]; 
    onUpdateSettings({ ...settings, aiConfigs: newConfigs }); 
    setEditingConfig(newConfig); 
  };

  const handleDelete = (id: string) => { 
      if (!confirm('确定删除此 AI 配置吗？')) return; 
      onUpdateSettings({ ...settings, aiConfigs: settings.aiConfigs.filter(c => c.id !== id) }); 
      if (editingConfig?.id === id) setEditingConfig(null); 
  };

  const handleSave = (config: AIProviderConfig) => {
      const n = settings.aiConfigs.map(c => c.id === config.id ? config : c);
      onUpdateSettings({ ...settings, aiConfigs: n });
      setEditingConfig(null);
      addToast('success', '配置已保存');
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">AI 服务配置</h2>
            <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"><Plus size={18}/> 添加模型</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {settings.aiConfigs.map(c => <AiProviderCard key={c.id} config={c} onEdit={setEditingConfig} onDelete={handleDelete}/>)}
        </div>
        <AiConfigModal isOpen={!!editingConfig} config={editingConfig} onClose={() => setEditingConfig(null)} onSave={handleSave} onTest={testAiConnection}/>
    </div>
  );
};
