import { useMemo, useState } from 'react'
import { DIAS_CORTOS, claveFecha, diasPrevistos, lunesDe, mismaFecha, soloDia } from '../lib/plan'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Calendario del paciente: vista semana (por defecto) o mes.
// Punto verde azulado = día con entreno previsto; ✓ verde = entreno hecho; punto ámbar = empezado sin terminar.
export default function Calendario({ rutina, sesiones, seleccionada, onElegir }) {
  const [vista, setVista] = useState('semana')
  const [ancla, setAncla] = useState(() => soloDia(seleccionada ?? new Date()))
  const hoy = soloDia(new Date())

  const porFecha = useMemo(() => {
    const m = {}
    for (const s of sesiones ?? []) {
      const actual = m[s.fecha]
      m[s.fecha] = actual === 'hecho' || s.completada ? 'hecho' : 'empezado'
    }
    return m
  }, [sesiones])

  const dias = useMemo(() => {
    if (vista === 'semana') {
      const l = lunesDe(ancla)
      return Array.from({ length: 7 }, (_, k) => { const d = new Date(l); d.setDate(l.getDate() + k); return d })
    }
    const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1)
    const ini = lunesDe(primero)
    return Array.from({ length: 42 }, (_, k) => { const d = new Date(ini); d.setDate(ini.getDate() + k); return d })
  }, [vista, ancla])

  const mover = paso => {
    const n = new Date(ancla)
    if (vista === 'semana') n.setDate(n.getDate() + 7 * paso)
    else n.setMonth(n.getMonth() + paso, 1)
    setAncla(n)
  }
  const titulo = vista === 'semana'
    ? (() => { const a = dias[0], b = dias[6]; return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MESES[b.getMonth()].toLowerCase()}` : `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3).toLowerCase()} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3).toLowerCase()}` })()
    : `${MESES[ancla.getMonth()]} ${ancla.getFullYear()}`

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="mb-2 flex items-center gap-1">
        <button onClick={() => mover(-1)} aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-slate-100">‹</button>
        <span className="flex-1 text-center text-sm font-semibold capitalize text-slate-800">{titulo}</span>
        <button onClick={() => mover(1)} aria-label="Siguiente" className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-slate-100">›</button>
        <div className="ml-1 flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
          {['semana', 'mes'].map(v => (
            <button key={v} onClick={() => { setVista(v); setAncla(soloDia(seleccionada ?? new Date())) }}
              className={`rounded-full px-3 py-1.5 capitalize transition ${vista === v ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DIAS_CORTOS.map(d => <div key={d} className="pb-1 text-[11px] font-semibold text-slate-400">{d}</div>)}
        {dias.map(d => {
          const fuera = vista === 'mes' && d.getMonth() !== ancla.getMonth()
          const previsto = diasPrevistos(rutina, d).length > 0
          const estado = porFecha[claveFecha(d)]
          const esHoy = mismaFecha(d, hoy)
          const sel = seleccionada && mismaFecha(d, seleccionada)
          return (
            <button key={d.toISOString()} onClick={() => onElegir?.(d)}
              className={`mx-auto flex flex-col items-center rounded-2xl transition ${vista === 'semana' ? 'w-11 py-1.5' : 'w-10 py-1'} ${sel ? 'bg-teal-700 text-white shadow-md shadow-teal-900/20' : 'hover:bg-slate-50'} ${fuera ? 'opacity-35' : ''}`}>
              <span className={`flex items-center justify-center rounded-full font-semibold ${vista === 'semana' ? 'h-8 w-8 text-[15px]' : 'h-7 w-7 text-[13px]'} ${!sel && esHoy ? 'ring-2 ring-teal-600 text-teal-800' : ''}`}>{d.getDate()}</span>
              <span className="mt-0.5 flex h-3 items-center justify-center">
                {estado === 'hecho' ? <span className={`text-[11px] font-bold leading-none ${sel ? 'text-white' : 'text-emerald-600'}`}>✓</span>
                  : estado === 'empezado' ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    : previsto ? <span className={`h-1.5 w-1.5 rounded-full ${sel ? 'bg-white' : 'bg-teal-500'}`} /> : null}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Entreno</span>
        <span className="flex items-center gap-1"><span className="font-bold text-emerald-600">✓</span> Hecho</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> A medias</span>
      </div>
    </div>
  )
}
