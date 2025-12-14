
import React from 'react';
import { useAppController } from './hooks/useAppController';
import { AdminView } from './components/views/AdminView';
import { PublicView } from './components/views/PublicView';

export const App: React.FC = () => {
  const controller = useAppController();

  if (controller.isEditMode) {
    return <AdminView {...controller} />;
  }

  return <PublicView {...controller} />;
};
