import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useAuthStore } from '@/store/authStore';
import { applySystemTheme } from '@/utils/theme';
import './index.css';

applySystemTheme();
// Validate any persisted JWT before the first render paths hit AuthGuard.
void useAuthStore.getState().initialize();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
