import { useEffect, useRef, useState } from 'react'

const OPCIONES = [30, 60, 90, 120, 180]
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Pitido corto al terminar el descanso (sin archivos de sonido)
function pitar() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.25, 0.5].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2)
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2)
    })
  } catch { /* sin sonido */ }
  try { navigator.vibrate?.([200, 100, 200]) } catch { /* sin vibración */ }
}

// Cronómetro de descanso entre series
export default function Descanso({ onCerrar }) {
  const [total, setTotal] = useState(null)   // segundos elegidos
  const [queda, setQueda] = useState(0)
  const fin = useRef(0)

  useEffect(() => {
    if (!total) return
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((fin.current - Date.now()) / 1000))
      setQueda(s)
      if (s === 0) { clearInterval(t); pitar() }
    }, 250)
    return () => clearInterval(t)
  }, [total])

  const empezar = s => { fin.current = Date.now() + s * 1000; setQueda(s); setTotal(s) }
  const sumar = s => { fin.current += s * 1000; setQueda(q => q + s) }
  const pct = total ? (queda / total) * 100 : 0

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/60 p-3 sm:items-center" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Descanso</h3>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        {!total ? (
          <>
            <p className="mt-1 text-sm text-slate-500">¿Cuánto quieres descansar?</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {OPCIONES.map(s => <button key={s} onClick={() => empezar(s)} className="h-14 rounded-2xl bg-teal-50 text-lg font-bold text-teal-800 ring-1 ring-teal-200 active:scale-95">{s < 60 ? `${s}s` : mmss(s)}</button>)}
            </div>
          </>
        ) : (
          <>
            <div className="relative mx-auto mt-4 h-44 w-44">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle cx="50" cy="50" r="44" fill="none" stroke={queda ? '#0f766e' : '#10b981'} strokeWidth="8" strokeLinecap="round" strokeDasharray={276.5} strokeDashoffset={276.5 * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-300" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tabular-nums">{mmss(queda)}</span>
                {!queda && <span className="text-sm font-semibold text-emerald-600">¡A por la siguiente!</span>}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => sumar(15)} className="btn-sec !h-11 flex-1">+15 s</button>
              <button onClick={() => setTotal(null)} className="btn-sec !h-11 flex-1">Cambiar</button>
              <button onClick={onCerrar} className="btn !h-11 flex-1">{queda ? 'Saltar' : 'Listo'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
