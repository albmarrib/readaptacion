import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { activarAvisos, pushDisponible, registrarDispositivo } from '../lib/push'

const CLAVE = 'readaptacion.bienvenida'
const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const esIOS = /iphone|ipad|ipod/i.test(ua)
const esAndroid = /android/i.test(ua)
const esMovil = esIOS || esAndroid

// Mensaje de bienvenida: explica cómo instalar la app y por qué permitir los avisos.
// Se adapta a iPhone, Android y ordenador, y desaparece solo cuando todo está hecho (o al cerrarlo).
export default function BienvenidaApp() {
  const { perfil } = useAuth()
  const [oculto, setOculto] = useState(() => { try { return localStorage.getItem(CLAVE) === '1' } catch { return false } })
  const [evento, setEvento] = useState(null)       // Android/Chrome: permite instalar con un botón
  const [push, setPush] = useState('...')           // '...' | 'no' (no disponible) | 'default' | 'granted' | 'denied'
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [, redibujar] = useState(0)

  useEffect(() => {
    const f = e => { e.preventDefault(); setEvento(e) }
    const hecho = () => { setEvento(null); redibujar(n => n + 1) }
    window.addEventListener('beforeinstallprompt', f)
    window.addEventListener('appinstalled', hecho)
    return () => { window.removeEventListener('beforeinstallprompt', f); window.removeEventListener('appinstalled', hecho) }
  }, [])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      if (!perfil) return
      if (!(await pushDisponible())) { if (vivo) setPush('no'); return }
      if (Notification.permission === 'granted') registrarDispositivo(perfil).catch(() => {}) // renueva el registro en silencio
      if (vivo) setPush(Notification.permission)
    })()
    return () => { vivo = false }
  }, [perfil?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const cerrar = () => { setOculto(true); try { localStorage.setItem(CLAVE, '1') } catch { /* sin almacenamiento */ } }
  const activar = async () => {
    setOcupado(true); setError('')
    try { setPush(await activarAvisos(perfil)) } catch (e) { setError('No se pudieron activar: ' + e.message) } finally { setOcupado(false) }
  }

  const pasoInstalar = esMovil && !instalada()
  const pasoAvisos = push === 'default' || push === 'denied' || (push === 'no' && esIOS && !instalada())
  if (oculto || push === '...' || (!pasoInstalar && !pasoAvisos)) return null

  return (
    <div className="relative mb-4 rounded-2xl border border-teal-200 bg-white p-4 pr-10 shadow-sm">
      <button onClick={cerrar} aria-label="Cerrar este mensaje" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">✕</button>
      <h2 className="text-sm font-semibold text-slate-900">Saca el máximo a la app 👋</h2>
      <ol className="mt-2 space-y-3 text-xs leading-relaxed text-slate-700">
        {pasoInstalar && (
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">1</span>
            <div>
              <b className="text-slate-900">Ponla en la pantalla de inicio</b>, como cualquier otra app.
              {esIOS ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">
                  <li>En Safari, toca el botón <b>Compartir</b> (el cuadrado con una flecha hacia arriba).</li>
                  <li>Desliza y elige <b>«Añadir a pantalla de inicio»</b>, y pulsa <b>Añadir</b>.</li>
                  <li>Ábrela desde el nuevo icono y entra con tu correo y contraseña.</li>
                </ul>
              ) : evento ? (
                <div className="mt-1.5"><button className="btn btn-xs" onClick={async () => { evento.prompt(); await evento.userChoice.catch(() => {}); setEvento(null) }}>Instalar la app</button></div>
              ) : (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">
                  <li>En Chrome, toca el menú <b>⋮</b> (arriba a la derecha).</li>
                  <li>Elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</li>
                </ul>
              )}
            </div>
          </li>
        )}
        {pasoAvisos && (
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">{pasoInstalar ? 2 : 1}</span>
            <div>
              <b className="text-slate-900">Permite los avisos: es importante.</b> Así te avisamos de los mensajes nuevos aunque tengas la app cerrada.
              {push === 'default' && <div className="mt-1.5"><button className="btn btn-xs" onClick={activar} disabled={ocupado}>{ocupado ? 'Activando…' : 'Activar avisos'}</button></div>}
              {push === 'no' && <p className="mt-1 text-slate-500">En iPhone se activan desde el icono de la pantalla de inicio: ábrela desde ahí y te lo volverá a pedir.</p>}
              {push === 'denied' && <p className="mt-1 text-amber-700">Los tienes bloqueados. Actívalos en los ajustes del móvil o del navegador para esta app.</p>}
              {error && <p role="alert" className="mt-1 text-red-600">{error}</p>}
            </div>
          </li>
        )}
      </ol>
      <div className="mt-3 text-right"><button onClick={cerrar} className="text-xs font-medium text-slate-500 underline hover:text-slate-800">Entendido, no mostrar más</button></div>
    </div>
  )
}
