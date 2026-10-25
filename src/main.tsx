import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* SW not critical */ });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Keep the launch splash from index.html up for at least ~1.5s from page
// start (so the icon is actually seen, not flashed), then fade it out.
const SPLASH_MIN_MS = 1500;
requestAnimationFrame(() => {
  const splash = document.getElementById('splash');
  if (!splash) return;
  setTimeout(() => {
    splash.classList.add('hide');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    setTimeout(() => splash.remove(), 1000);
  }, Math.max(0, SPLASH_MIN_MS - performance.now()));
});
