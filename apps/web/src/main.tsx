import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initAnalytics } from './lib/analytics';
import { initSentry } from './lib/sentry';
import { initI18n } from './lib/i18n';
import { initTheme } from './lib/theme';

initTheme();
initI18n();
void initSentry();
void initAnalytics();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
