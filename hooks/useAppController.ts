
import { useCoreData } from './useCoreData';
import { useAppSettings } from './useAppSettings';
import { useAuth } from './useAuth';
import { useAI } from './useAI';
import { useSystem } from './useSystem';
import { useUIState } from './useUIState';

// This is the "Aggregator" pattern. 
// It keeps the implementation details separated but the interface unified.
export const useAppController = () => {
  // 1. Initialize atomic hooks
  const ui = useUIState();
  const system = useSystem();
  const auth = useAuth();
  const settings = useAppSettings();
  const core = useCoreData();
  
  // 2. AI hook needs data from settings and core
  const ai = useAI(core.categories, settings.settings.enableAiGreeting);

  // 3. Compose complex actions that span multiple domains
  
  // Wrappers to connect UI interactions with Data Logic
  const handleDropWrapper = (e: React.DragEvent, targetCatId: string, targetIndex: number) => {
      e.preventDefault();
      if (!ui.draggedItem) return;
      core.handleDrop(ui.draggedItem, targetCatId, targetIndex);
      ui.setDraggedItem(null);
  };

  const handleSaveLinkWrapper = (linkData: any) => {
      if (!ui.editingLink) return;
      core.handleSaveLink(ui.editingLink, linkData);
      ui.setEditingLink(null);
      ui.addToast('success', `链接已保存`);
  };

  const handleDeleteCategoryWrapper = (cat: any) => {
      if (confirm(`确定要删除分类 "${cat.title}" 吗？`)) {
          core.handleDeleteCategory(cat);
          ui.addToast('success', '分类已删除');
      }
  };

  const handleLinkClickWrapper = (cat: any, link: any) => {
      ui.setClickedLinkId(link.id); 
      setTimeout(() => ui.setClickedLinkId(null), 350);
      core.handleLinkClick(cat, link, settings.settings.openInNewTab);
  };

  const handleLoginWrapper = (pwd: string) => {
      if (auth.handleLogin(pwd)) {
          ui.setShowLoginModal(false);
          ui.addToast('success', '管理员登录成功');
          return true;
      }
      return false;
  };

  const handleExitEditWrapper = () => {
      auth.setIsEditMode(false);
      ui.addToast('info', '返回主页');
  };

  const handleFileUploadWrapper = (e: any, type: 'logo' | 'bg' | 'qr') => {
      settings.handleFileUpload(e, type, 
        (msg) => ui.addToast('success', msg), 
        (msg) => ui.addToast('error', msg)
      );
  };

  const toggleThemeWrapper = () => {
      const newTheme = settings.toggleTheme();
      ui.addToast('info', `切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`);
  };

  // 4. Return the massive object expected by views
  return {
    // UI State
    ...ui,
    
    // System State
    ...system,

    // Auth State
    ...auth,
    handleLogin: handleLoginWrapper,
    onExitEdit: handleExitEditWrapper,

    // Settings State
    ...settings,
    handleFileUpload: handleFileUploadWrapper,
    toggleTheme: toggleThemeWrapper,

    // Core Data State
    ...core,
    handleLinkClick: handleLinkClickWrapper,
    handleSaveLink: handleSaveLinkWrapper,
    handleDeleteCategory: handleDeleteCategoryWrapper,
    handleDrop: handleDropWrapper,
    
    // AI State
    ...ai,
    
    // Drag & Drop specific (UI side)
    handleDragStart: (e: React.DragEvent, catId: string, index: number) => {
        ui.setDraggedItem({ catId, index });
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `${catId}:${index}`);
    },
    handleDragOver: (e: React.DragEvent) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = "move";
    },
  };
};
