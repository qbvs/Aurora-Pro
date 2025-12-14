
import React from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { Modal } from '../Modal';
import { Favicon } from '../Favicon';

interface BlockModalProps {
  urls: string[];
  onClose: () => void;
}

export const BlockModal: React.FC<BlockModalProps> = ({ urls, onClose }) => {
  if (!urls || urls.length === 0) return null;

  return (
    <Modal 
        title="浏览器拦截提示" 
        onClose={onClose} 
        icon={<ShieldAlert className="text-amber-500"/>}
    >
        <div className="p-6 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-600 dark:text-amber-400">
                <p className="font-bold mb-1">部分页面未自动打开</p>
                <p>浏览器安全策略限制了自动打开多个标签页。您可以点击下方列表手动打开，或在地址栏设置中允许本站的弹窗权限。</p>
            </div>

            <div className="space-y-2">
                {urls.map((url, idx) => (
                    <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all group"
                        onClick={() => {
                            // 点击后该链接已处理，如果只剩这一个，点击后建议关闭弹窗？
                            // 为了体验，保持弹窗开启直到用户手动关闭，防止误触
                        }}
                    >
                        <Favicon url={url} size={20} className="rounded"/>
                        <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{url}</span>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-cyan-500"/>
                    </a>
                ))}
            </div>

            <button 
                onClick={onClose} 
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors"
            >
                关闭
            </button>
        </div>
    </Modal>
  );
};
