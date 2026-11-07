import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Al publicar una versión nueva, la app se actualiza sola (sin tener que recargar a la fuerza)
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) { if (registro) setInterval(() => registro.update(), 30 * 60 * 1000) },
})
