import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { useStore } from './lib/store'
import { router } from './router'

// Demo-Daten beim allerersten Start sofort speichern, damit IDs über Reloads stabil bleiben.
try {
  if (!localStorage.getItem('rb-studio-v1')) useStore.setState({})
} catch {
  // Speicher nicht verfügbar (privater Modus) – App läuft trotzdem, nur ohne Persistenz.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
