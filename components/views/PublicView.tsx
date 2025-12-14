
import React from 'react';
import { ArrowLeft, QrCode } from 'lucide-react';
import { cn } from '../../utils';
import { Header } from '../public/Header';
import { PublicSidebar } from '../public/PublicSidebar';
import { CategoryList } from '../public/CategoryList';
import { AiCommandPanel } from '../AiCommandPanel';
import { ToastContainer } from '../ui/Toast';
import { LoginModal } from '../modals/LoginModal';
import { Modal } from '../Modal';
import { useAppController } from '../../hooks/useAppController';
import { askSimpleQuestion, getAiGreeting, generateCategoryLinks } from '../../services/geminiService';

export const PublicView: React.FC<ReturnType<typeof useAppController>> = (props) => {
  const visibleCategories = props.viewCategory 
      ? props.categories.filter(c => c.id === props.viewCategory)
      : props.categories;

  const uniqueLinkCount = new Set(
      props.categories.flatMap(c => c.links.map(l => l.url))
  ).size;

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-500 ease-out selection:bg-cyan-500/30 text-slate-900 dark:text-slate-100", 
        props.settings.backgroundMode === 'monotone' ? "bg-slate-50 dark:bg-slate-950" : "bg-transparent")}>
        
        {/* 背景层渲染逻辑 */}
        {props.settings.backgroundMode === 'custom' && props.settings.customBackgroundImage && (
            <div className="fixed inset-0 bg-cover bg-center -z-20 transition-opacity duration-700" style={{ backgroundImage: `url(${props.settings.customBackgroundImage})` }} />
        )}
        
        {props.settings.backgroundMode === 'aurora' && (
          <div className="fixed inset-0 overflow-hidden -z-20 pointer-events-none select-none transition-colors duration-1000 ease-in-out bg-slate-50 dark:bg-[#020617]">
              <div className="hidden dark:block">
                  <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-900/30 rounded-full blur-[120px] animate-float opacity-60"/>
                  <div className="absolute top-[10%] right-[-20%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[120px] animate-float opacity-50" style={{ animationDelay: '2s' }}/>
                  <div className="absolute bottom-[-10%] left-[20%] w-[70vw] h-[70vw] bg-cyan-900/10 rounded-full blur-[150px] animate-float opacity-40" style={{ animationDelay: '4s' }}/>
              </div>
              {/* 为了简洁，省略浅色模式背景圆球，逻辑同上 */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          </div>
        )}
        <div className="fixed inset-0 bg-white/30 dark:bg-slate-950/20 -z-10 backdrop-blur-[1px]" />

        <Header 
          settings={props.settings} searchEngines={props.searchEngines} onUpdateSettings={props.handleUpdateSettings}
          searchTerm={props.searchTerm} setSearchTerm={props.setSearchTerm}
          isDark={props.isDark} toggleTheme={props.toggleTheme}
          isAuthenticated={props.isAuthenticated} onOpenLogin={() => props.setShowLoginModal(true)} onEnterEditMode={() => props.setIsEditMode(true)}
          uniqueLinkCount={uniqueLinkCount}
        />

        <div className="pt-28 px-4 lg:px-12 max-w-[1600px] mx-auto flex gap-12 h-screen">
            <PublicSidebar 
                clock={props.clock} greetingTime={props.greetingTime} dateInfo={props.dateInfo} weatherInfo={props.weatherInfo}
                categories={props.categories} viewCategory={props.viewCategory} setViewCategory={props.setViewCategory}
                uniqueLinkCount={uniqueLinkCount} socialLinks={props.settings.socialLinks} onShowQr={(url) => props.setShowQrModal(url)}
            />

            <main className="flex-1 min-w-0 flex flex-col h-[calc(100vh-120px)]">
                <div className="shrink-0 z-20 px-2"> 
                    {props.settings.enableAiGreeting && !props.viewCategory && (
                        <div className={cn("transition-all duration-500 ease-in-out overflow-hidden transform", props.isHeaderVisible ? "max-h-[500px] opacity-100 translate-y-0 mb-0" : "max-h-0 opacity-0 -translate-y-8 mb-0")}> 
                            <AiCommandPanel 
                                initialGreeting={props.aiGreeting} onRefreshGreeting={props.handleAiRefreshGreeting}
                                onAskQuestion={askSimpleQuestion} onDiscoverSites={props.handleAiDiscovery} onAddLink={() => {}}
                            />
                        </div>
                    )}
                    {props.viewCategory && (
                        <div className="mb-8 animate-fade-in">
                            <button onClick={() => props.setViewCategory(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/10 transition-all group">
                                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> 返回总览
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-20 scroll-smooth" onScroll={props.handleContentScroll}>
                    <CategoryList 
                        categories={visibleCategories} viewCategory={props.viewCategory} setViewCategory={props.setViewCategory}
                        handleLinkClick={props.handleLinkClick} settings={props.settings} clickedLinkId={props.clickedLinkId}
                    />
                </div>
            </main>
        </div>
        
        <ToastContainer toasts={props.toasts} remove={props.removeToast} />
        <LoginModal isOpen={props.showLoginModal} onClose={() => props.setShowLoginModal(false)} onLogin={props.handleLogin} />
        {props.showQrModal && (<Modal title="扫描二维码" onClose={() => props.setShowQrModal(null)} icon={<QrCode className="text-emerald-400"/>}><div className="p-8 flex justify-center bg-white rounded-xl"><img src={props.showQrModal!} alt="QR Code" className="max-w-[300px] rounded-lg shadow-lg"/></div></Modal>)}
    </div>
  );
};
