import { useMemo, useState } from 'react'
import { useSistemas, useVolumenes } from '../lib/datos'
import { normalizar } from '../lib/util'
import { agruparPorSistema, describirLinea, formatLineas, nombreVolumen } from '../lib/volumen'
import EditorVolumen from './EditorVolumen'
import Modal from './Modal'

// Elige un volumen del catálogo, o crea uno nuevo (que se guarda en el catálogo y se asigna).
export default function SelectorVolumen({ actual, onClose, onElegir, onQuitar }) {
  const sistemas = useSistemas()
  const volumenes = useVolumenes()
  const [sistemaId, setSistemaId] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (volumenes ?? [])
      .filter(v => sistemaId === 'todos' || v.sistemaId === sistemaId)
      .filter(v => !q || normalizar(`${v.nombre ?? ''} ${formatLineas(v.lineas)}`).includes(q))
      .sort((a, b) => nombreVolumen(a).localeCompare(nombreVolumen(b), 'es', { numeric: true }))
  }, [volumenes, sistemaId, busqueda])

  if (!sistemas || !volumenes) return <Modal titulo="Volumen" onClose={onClose}><p className="text-slate-500">Cargando…</p></Modal>

  return (
    <Modal titulo="Elegir volumen" onClose={onClose} ancho="max-w-2xl">
      <div className="space-y-3">
        <button className="btn w-full" onClick={() => setCreando(true)}>+ Crear volumen nuevo</button>

        {volumenes.length > 0 && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[{ id: 'todos', nombre: 'Todos' }, ...sistemas].map(s => (
                <button key={s.id} onClick={() => setSistemaId(s.id)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${s.id === sistemaId ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{s.nombre}</button>
              ))}
            </div>
            <input className="input" type="search" placeholder="Buscar volumen…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </>
        )}

        {agruparPorSistema(filtrados, sistemas).map(({ sistema, items }) => (
          <section key={sistema.id}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{sistema.nombre}</h3>
            <ul className="space-y-2">
              {items.map(v => (
                <li key={v.id}>
                  <button onClick={() => onElegir(v)} className={`w-full rounded-2xl border p-3 text-left hover:border-teal-500 ${v.id === actual ? 'border-teal-600 bg-teal-50' : 'border-slate-200'}`}>
                    <div className="font-medium">{nombreVolumen(v)}</div>
                    <ul className="mt-0.5 text-xs text-slate-500">{v.lineas.map((l, i) => <li key={i}>{describirLinea(l)}</li>)}</ul>
                    <div className="mt-1 text-xs font-medium text-teal-800">{v.seriesTotales} series</div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {volumenes.length > 0 && filtrados.length === 0 && <p className="text-center text-sm text-slate-500">Ningún volumen coincide.</p>}
        {volumenes.length === 0 && <p className="text-center text-sm text-slate-500">El catálogo de volúmenes está vacío. Crea el primero.</p>}
        {onQuitar && <button className="btn-sec w-full" onClick={onQuitar}>Quitar el volumen de este ejercicio</button>}
      </div>

      {creando && <EditorVolumen sistemas={sistemas} onClose={() => setCreando(false)} onGuardado={v => { setCreando(false); onElegir(v) }} />}
    </Modal>
  )
}
