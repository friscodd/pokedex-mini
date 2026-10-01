import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const navigationEntry = performance.getEntriesByType("navigation")[0];
if (navigationEntry?.type === "reload") {
  try {
    sessionStorage.removeItem("pokedex-mini-catalogue-filters");
    sessionStorage.removeItem("pokedex-mini-home-scroll");
  } catch {}

  if (window.location.hash !== "#/") {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/`);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
