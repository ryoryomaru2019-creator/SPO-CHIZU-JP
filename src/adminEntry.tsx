import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminQuestionsPage } from './admin/AdminQuestionsPage';
import './styles.css';

const AdminApp: React.FC = () => {
  const handleOpenGame = () => {
    window.open('/', '_blank');
  };

  return (
    <div className="standalone-admin-app">
      <AdminQuestionsPage
        onBackToGame={handleOpenGame}
        isStandalone={true}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('admin-root') as HTMLElement).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);

