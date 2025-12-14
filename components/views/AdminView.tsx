
import React from 'react';
import { Sidebar } from '../admin/Sidebar';
import { Dashboard } from '../admin/Dashboard';
import { WidgetManager } from '../admin/widgets/WidgetManager';
import { WorkflowManager } from '../admin/automation/WorkflowManager'; // New
import { GeneralSettings } from '../admin/settings/GeneralSettings';
import { AiSettings } from '../admin/settings/AiSettings';
import { AppearanceSettings } from '../admin/settings/AppearanceSettings';
import { SearchSettings } from '../admin/settings/SearchSettings';
import { LogViewer } from '../admin/LogViewer';
import { CategoryModal } from '../admin/modals/CategoryModal';
import { LinkModal } from '../admin/modals/LinkModal';
import { GeneratorModal } from '../admin/modals/GeneratorModal';
import { ToastContainer } from '../ui/Toast';
import { useAppController } from '../../hooks/useAppController';

export const AdminView: React.FC<ReturnType<typeof useAppController>> = (props) => {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans transition-colors selection:bg-cyan-500/30">
        <Sidebar 
          activeTab={props.activeTab} 
          setActiveTab={props.setActiveTab} 
          cloudSyncStatus={props.cloudSyncStatus} 
          onLogout={() => { props.setIsAuthenticated(false); localStorage.removeItem('aurora_auth'); props.setIsEditMode(false); }}
          onExitEdit={() => { props.setIsEditMode(false); props.addToast('info','返回主页'); }}
          language={props.settings.language} 
        />
        <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen bg-slate-950/50 custom-scrollbar">
            <div className="max-w-5xl mx-auto pb-20">
                {props.activeTab === 'dashboard' && (
                    <Dashboard 
                        categories={props.categories}
                        setCategories={props.setCategories}
                        onSaveData={props.handleSaveData}
                        onOpenGenModal={(id, title) => props.setShowGenLinksModal({ id, title })}
                        onOpenAddCat={() => props.setShowAddCatModal(true)}
                        onEditLink={(catId, link) => props.setEditingLink({ catId, link })}
                        onDeleteLink={props.handleDeleteLink}
                        onDeleteCategory={props.handleDeleteCategory}
                        setBrokenLinks={props.setBrokenLinks}
                        draggedItem={props.draggedItem}
                        onDragStart={props.handleDragStart}
                        onDragOver={props.handleDragOver}
                        onDrop={props.handleDrop}
                    />
                )}
                {props.activeTab === 'widgets' && (
                    <WidgetManager 
                        widgets={props.settings.widgets}
                        onUpdateWidgets={(widgets) => props.handleUpdateSettings({...props.settings, widgets})}
                        addToast={props.addToast}
                    />
                )}
                {props.activeTab === 'automation' && (
                    <WorkflowManager 
                        workflows={props.settings.workflows}
                        onUpdateWorkflows={(workflows) => props.handleUpdateSettings({...props.settings, workflows})}
                        addToast={props.addToast}
                    />
                )}
                {props.activeTab === 'general' && (
                  <GeneralSettings 
                      settings={props.settings} 
                      onUpdateSettings={props.handleUpdateSettings} 
                      onFileUpload={props.handleFileUpload}
                  />
                )}
                {props.activeTab === 'ai' && (
                  <AiSettings 
                      settings={props.settings} 
                      onUpdateSettings={props.handleUpdateSettings} 
                      addToast={props.addToast}
                  />
                )}
                {props.activeTab === 'appearance' && (
                  <AppearanceSettings 
                      settings={props.settings} 
                      onUpdateSettings={props.handleUpdateSettings} 
                      onFileUpload={props.handleFileUpload}
                  />
                )}
                {props.activeTab === 'search' && (
                  <SearchSettings 
                      settings={props.settings}
                      searchEngines={props.searchEngines}
                      onUpdateSettings={props.handleUpdateSettings}
                      onUpdateEngines={props.handleUpdateEngines}
                      addToast={props.addToast}
                  />
                )}
                {props.activeTab === 'diagnose' && (
                  <LogViewer logs={props.logs} setLogs={props.setLogs} />
                )}
            </div>
        </main>
        
        <ToastContainer toasts={props.toasts} remove={props.removeToast} />
        
        <CategoryModal 
            isOpen={props.showAddCatModal}
            onClose={() => props.setShowAddCatModal(false)}
            onSave={(cat) => props.handleSaveData([...props.categories, cat])}
            addToast={props.addToast}
        />

        <GeneratorModal 
            isOpen={!!props.showGenLinksModal}
            onClose={() => props.setShowGenLinksModal(null)}
            category={props.showGenLinksModal}
            categories={props.categories}
            onSave={props.handleSaveGeneratedLinks}
            addToast={props.addToast}
        />
        
        <LinkModal 
            isOpen={!!props.editingLink}
            onClose={() => props.setEditingLink(null)}
            initialData={props.editingLink?.link || { color: '#666666' }}
            onSave={props.handleSaveLink}
            addToast={props.addToast}
        />
    </div>
  );
};
