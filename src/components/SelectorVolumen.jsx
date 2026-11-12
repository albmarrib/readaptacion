import { useMemo, useState } from 'react'
import { useSistemas, useVolumenes } from '../lib/datos'
import { normalizar } from '../lib/util'
import { describirLinea, formatLineas, nombreVolumen, ordenVolumenes } from '../lib/volumen'
import EditorVolumen from './EditorVolumen'
import Pestanas from './Pestanas'
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
      .sort(ordenVolumenes)
  }, [volumenes, sistemaId, busqueda])

  if (!sistemas || !volumenes) return <Modal titulo="Volumen" onClose={onClose}><p className="text-slate-500">Cargando…</p></Modal>

  return (
    <Modal titulo="Elegir volumen" onClose={onClose} ancho="max-w-2xl">
      <div className="space-y-3">
        <button className="btn w-full" onClick={() => setCreando(true)}>+ Crear volumen nuevo</button>

        {volumenes.length > 0 && (
          <>
            <Pestanas items={[{ id: 'todos', etiqueta: 'Todos' }, ...sistemas.map(s => ({ id: s.id, etiqueta: s.nombre }))]} activo={sistemaId} onChange={setSistemaId} />
            <input className="input" type="search" placeholder="Buscar volumen…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </>
        )}

        <ul className="space-y-2">
              {filtrados.map(v => (
                <li key={v.id}>
                  <button onClick={() => onElegir(v)} title={v.lineas.map(describirLinea).join('\n')} className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 text-left transition hover:border-teal-400 ${v.id === actual ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}>
                    <span className="min-w-0 truncate text-[13px] font-medium"><span className="font-mono">{nombreVolumen(v)}</span>{v.nombre && <span className="ml-2 font-mono text-xs text-slate-500">{formatLineas(v.lineas)}</span>}</span>
                    <span className="flex shrink-0 items-center gap-2">{sistemaId === 'todos' && <span className="text-[11px] text-slate-400">{sistemas.find(s => s.id === v.sistemaId)?.nombre ?? 'Sin sistema'}</span>}<span className="insignia bg-teal-50 text-teal-700">{v.seriesTotales} series</span></span>
                  </button>
                </li>
              ))}
        </ul>
        {volumenes.length > 0 && filtrados.length === 0 && <p className="text-center text-sm text-slate-500">Ningún volumen coincide.</p>}
        {volumenes.length === 0 && <p className="text-center text-sm text-slate-500">El catálogo de volúmenes está vacío. Crea el primero.</p>}
        {onQuitar && <button className="btn-sec w-full" onClick={onQuitar}>Quitar el volumen de este ejercicio</button>}
      </div>

      {creando && <EditorVolumen sistemas={sistemas} onClose={() => setCreando(false)} onGuardado={v => { setCreando(false); onElegir(v) }} />}
    </Modal>
  )
}
