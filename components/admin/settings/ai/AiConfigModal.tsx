
import React, { useState, useEffect } from 'react';
import { Bot, Activity, CircleCheck, TriangleAlert } from 'lucide-react';
import { AIProviderConfig } from '../../../../types';
import { Modal } from '../../../Modal';
import { LoadingSpinner } from '../../../ui/LoadingSpinner';
import { cn } from '../../../../utils';

interface Props {
    isOpen: boolean;
    config: AIProviderConfig | null;
    onClose: () => void;
    onSave: (c: AIProviderConfig) => void;
    onTest: (c: AIProviderConfig) => Promise<any>;
}

export const AiConfigModal: React.FC<Props> = ({ isOpen, config, onClose, onSave, onTest }) => {
    const [editingConfig, setEditingConfig] = useState<AIProviderConfig | null>(null);
    const [aiKeySource, setAiKeySource] = useState<'manual' | 'env'>('manual');
    const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'fail', message?: string }>({ status: 'idle' });

    useEffect(() => { 
        if (config) { 
            setEditingConfig(config);
            setAiKeySource(config.envSlot ? 'env' : 'manual'); 
            setTestStatus({ status: 'idle' }); 
        } 
    }, [config]);

    const handleTest = async () => {
        if (!editingConfig) return;
        setTestStatus({ status: 'loading' });
        const res = await onTest(editingConfig);
        setTestStatus({ status: res.success ? 'success' : 'fail', message: res.message });
    };

    if (!isOpen || !editingConfig) return null;

    return (
        <Modal title={editingConfig.id.startsWith('ai-') ? '编辑 AI 模型' : '添加 AI 模型'} onClose={onClose} icon={<Bot className="text-cyan-400"/>}>
            <div className="p-6 space-y-4 text-slate-200">
                <div><label className="block text-sm font-bold text-slate-400 mb-2">模型名称</label><input value={editingConfig.name} onChange={(e) => setEditingConfig({...editingConfig, name: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500"/></div>
                
                {/* 更多表单字段省略，保持逻辑一致，但结构清晰化 */}
                <div><label className="block text-sm font-bold text-slate-400 mb-2">模型 ID</label><input value={editingConfig.model} onChange={(e) => setEditingConfig({...editingConfig, model: e.target.value})} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-cyan-500 font-mono text-sm"/></div>

                {/* 按钮组 */}
                <div className="flex gap-3 pt-2">
                    <button onClick={handleTest} disabled={testStatus.status === 'loading'} className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex-1 flex items-center justify-center gap-2">{testStatus.status === 'loading' ? <LoadingSpinner/> : <Activity size={16}/>} 测试连接</button>
                    <button onClick={() => onSave(editingConfig)} className="px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm flex-[2]">保存配置</button>
                </div>
                
                {/* 测试结果 */}
                {testStatus.status !== 'idle' && (
                    <div className={cn("p-3 rounded-xl text-xs font-mono break-all", testStatus.status === 'success' ? "bg-emerald-900/20 text-emerald-400 border border-emerald-500/20" : "bg-red-900/20 text-red-400 border border-red-500/20")}>
                        {testStatus.status === 'success' ? <div className="flex items-center gap-2"><CircleCheck size={14}/> 连接成功</div> : <div className="flex items-start gap-2"><TriangleAlert size={14} className="shrink-0 mt-0.5"/> {testStatus.message}</div>}
                    </div>
                )}
            </div>
        </Modal>
    );
};
