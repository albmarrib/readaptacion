import { useEffect, useState } from 'react'

const CLAVE = 'readaptacion.avisoInstalar'
const yaInstalada = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// Aviso para instalar la app en la pantalla de inicio. Safari (iPhone) no lo ofrece solo,
// así que se explica el gesto; en Android/Chrome se ofrece un botón.
export default function InstalarApp() {
  const [oculto, setOculto] = useState(() => { try { return localStorage.getItem(CLAVE) === '1' } catch { return false } })
  const [evento, setEvento] = useState(null)

  useEffect(() => {
    const f = e => { e.preventDefault(); setEvento(e) }
    window.addEventListener('beforeinstallprompt', f)
    return () => window.removeEventListener('beforeinstallprompt', f)
  }, [])

  const ocultar = () => { setOculto(true); try { localStorage.setItem(CLAVE, '1') } catch { /* sin almacenamiento */ } }
  if (oculto || yaInstalada()) return null
  if (!evento && !esIOS()) return null

  return (
    <div className="relative rounded-2xl border border-teal-200 bg-white p-3.5 pr-9 shadow-sm">
      <button onClick={ocultar} aria-label="Cerrar aviso" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">✕</button>
      <p className="text-sm font-semibold text-slate-900">Instala la app en tu móvil</p>
      {evento ? (
        <>
          <p className="mt-0.5 text-xs text-slate-600">Tenla siempre a mano, como cualquier otra app.</p>
          <button className="btn mt-2 !h-9" onClick={async () => { evento.prompt(); await evento.userChoice.catch(() => {}); setEvento(null) }}>Instalar</button>
        </>
      ) : (
        <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs leading-relaxed text-slate-600">
          <li>Toca el botón <b>Compartir</b> de Safari (el cuadrado con una flecha hacia arriba, abajo en la pantalla).</li>
          <li>Desliza y elige <b>«Añadir a pantalla de inicio»</b>.</li>
          <li>Pulsa <b>Añadir</b>. Ya tendrás el icono de Readaptación.</li>
        </ol>
      )}
    </div>
  )
}
