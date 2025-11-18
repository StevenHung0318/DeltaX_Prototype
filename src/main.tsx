import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import synexLogo from './assets/Synexlogo.png';

const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
if (favicon) {
  favicon.href = synexLogo;
  favicon.type = 'image/png';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
