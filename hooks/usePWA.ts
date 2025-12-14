
import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // 防止 Chrome 67 及更早版本自动显示安装提示
      e.preventDefault();
      // 暂存事件以便稍后触发
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 检查是否已安装 (简单的媒体查询检查)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    
    // 显示安装提示
    deferredPrompt.prompt();
    
    // 等待用户反馈
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return { isInstallable, installPWA };
};
