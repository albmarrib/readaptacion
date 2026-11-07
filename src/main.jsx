import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { AuthProvider, AuthContext } from './lib/auth.jsx'

// Solo desarrollo: VITE_DEMO=1 simula una sesión de administrador para revisar el diseño sin iniciar sesión.
const DEMO = import.meta.env.DEV && import.meta.env.VITE_DEMO === '1'
const sesionDemo = { usuario: { uid: 'demo' }, perfil: { uid: 'demo', rol: 'admin', nombre: 'Albert Martínez', activo: true }, estado: 'ok', esAdmin: true, esEntrenador: false, esPaciente: false, esPersonal: true, puedeEditarCatalogo: true, salir: () => {} }
const Proveedor = ({ children }) => (DEMO ? <AuthContext.Provider value={sesionDemo}>{children}</AuthContext.Provider> : <AuthProvider>{children}</AuthProvider>)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Proveedor>
        <App />
      </Proveedor>
    </BrowserRouter>
  </StrictMode>,
)

// Al publicar una versión nueva, la app se actualiza sola (sin tener que recargar a la fuerza)
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) { if (registro) setInterval(() => registro.update(), 30 * 60 * 1000) },
})
