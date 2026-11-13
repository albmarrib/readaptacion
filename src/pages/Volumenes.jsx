import { useMemo, useState } from 'react'
import { useSistemas, useVolumenes } from '../lib/datos'
import { normalizar } from '../lib/util'
import { describirLinea, formatLineas, nombreVolumen, ordenVolumenes } from '../lib/volumen'

const describirVolumen = v => v.lineas.map(describirLinea).join('\n')
import EditorVolumen from '../components/EditorVolumen'
import GestionSistemas from '../components/GestionSistemas'
import { EncabezadoPagina, IconoVolumenes } from '../components/Iconos'
import Pestanas from '../components/Pestanas'

export default function Volumenes() {
  const sistemas = useSistemas()
  const volumenes = useVolumenes()
  const [sistemaId, setSistemaId] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [editor, setEditor] = useState(null) // { volumen? } | null
  const [gestion, setGestion] = useState(false)

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (volumenes ?? [])
      .filter(v => sistemaId === 'todos' || v.sistemaId === sistemaId)
      .filter(v => !q || normalizar(`${v.nombre ?? ''} ${formatLineas(v.lineas)} ${v.observaciones ?? ''}`).includes(q))
      .sort(ordenVolumenes)
  }, [volumenes, sistemaId, busqueda])

  if (!sistemas || !volumenes) return <p className="text-slate-500">Cargando…</p>
  const nombreSistema = id => sistemas.find(s => s.id === id)?.nombre ?? 'Sin sistema'

  return (
    <div className="space-y-4">
      <EncabezadoPagina icono={IconoVolumenes} color="violet" titulo="Sistemas de Entrenamiento" subtitulo="Series y repeticiones reutilizables en las rutinas (p. ej. 3*10)">
        <div className="flex gap-2">
          <button className="btn-sec" onClick={() => setGestion(true)} title="Añadir, renombrar o borrar los sistemas de entrenamiento">Editar sistemas de entrenamiento</button>
          <button className="btn" onClick={() => setEditor({})}>+ Nuevo volumen</button>
        </div>
      </EncabezadoPagina>

      {volumenes.length > 0 && (
        <>
          <Pestanas items={[{ id: 'todos', etiqueta: 'Todos', n: volumenes.length }, ...sistemas.map(s => ({ id: s.id, etiqueta: s.nombre, n: volumenes.filter(v => v.sistemaId === s.id).length }))]} activo={sistemaId} onChange={setSistemaId} />
          <input className="input" type="search" placeholder="Buscar volumen…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </>
      )}

      {volumenes.length === 0 ? (
        <div className="tarjeta text-center text-slate-500">Todavía no hay volúmenes. Crea el primero con «Nuevo volumen», o directamente al preparar una rutina.</div>
      ) : (
        <div className="space-y-3">
          {/* Una sola lista ordenada (1 serie, 2, 3…); en «Todos» cada tarjeta indica su sistema */}
          <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
            {filtrados.map(v => (
              <li key={v.id}>
                <button onClick={() => setEditor({ volumen: v })} title={describirVolumen(v)} className="tarjeta flex h-[78px] w-full flex-col justify-between !p-3 text-left transition hover:border-teal-400 hover:shadow-md">
                  <div className={`truncate text-[13px] font-semibold text-slate-900 ${v.nombre ? '' : 'font-mono'}`}>{nombreVolumen(v)}</div>
                  <div className="truncate font-mono text-xs text-slate-500">{v.nombre ? formatLineas(v.lineas) : `${v.lineas.length} línea${v.lineas.length === 1 ? '' : 's'}`}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="insignia shrink-0 bg-teal-50 text-teal-700">{v.seriesTotales} series</span>
                    {sistemaId === 'todos'
                      ? <span className="truncate text-[11px] text-slate-400">{nombreSistema(v.sistemaId)}</span>
                      : <span className="text-[11px] text-slate-400">Ver ›</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {filtrados.length === 0 && <div className="tarjeta text-center text-slate-500">Ningún volumen coincide.</div>}
        </div>
      )}

      {gestion && <GestionSistemas sistemas={sistemas} volumenes={volumenes} onClose={() => { setGestion(false); if (!sistemas.some(s => s.id === sistemaId)) setSistemaId('todos') }} />}
      {editor && (
        <EditorVolumen volumen={editor.volumen} sistemas={sistemas} onClose={() => setEditor(null)}
          onGuardado={() => setEditor(null)} onBorrado={() => setEditor(null)} />
      )}
    </div>
  )
}
