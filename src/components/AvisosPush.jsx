import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { activarAvisos, pushDisponible, registrarDispositivo } from '../lib/push'

const CLAVE = 'readaptacion.avisoPush'

// Invita a activar los avisos del móvil/ordenador (mensajes nuevos, rutinas terminadas).
// Si ya están activados, renueva el registro del dispositivo en silencio.
export default function AvisosPush() {
  const { perfil } = useAuth()
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      if (!perfil || !(await pushDisponible())) return
      if (Notification.permission === 'granted') { registrarDispositivo(perfil).catch(() => {}); return }
      let oculto = false
      try { oculto = localStorage.getItem(CLAVE) === '1' } catch { /* sin almacenamiento */ }
      if (Notification.permission === 'default' && !oculto && vivo) setVisible(true)
    })()
    return () => { vivo = false }
  }, [perfil?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const cerrar = () => { setVisible(false); try { localStorage.setItem(CLAVE, '1') } catch { /* sin almacenamiento */ } }
  const activar = async () => {
    setOcupado(true); setError('')
    try { const p = await activarAvisos(perfil); if (p === 'granted') setVisible(false); else if (p === 'denied') setError('Has bloqueado los avisos. Puedes cambiarlo en los ajustes del navegador.') }
    catch (e) { setError('No se pudieron activar: ' + e.message) }
    finally { setOcupado(false) }
  }

  if (!visible) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-white p-3 shadow-sm">
      <span className="text-xl" aria-hidden="true">🔔</span>
      <p className="min-w-0 flex-1 text-xs text-slate-700"><b className="font-semibold text-slate-900">¿Quieres recibir avisos?</b> Te avisamos de los mensajes nuevos aunque tengas la app cerrada.</p>
      <div className="flex gap-2">
        <button className="btn-sec btn-xs" onClick={cerrar} disabled={ocupado}>Ahora no</button>
        <button className="btn btn-xs" onClick={activar} disabled={ocupado}>{ocupado ? 'Activando…' : 'Activar avisos'}</button>
      </div>
      {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
    </div>
  )
}
