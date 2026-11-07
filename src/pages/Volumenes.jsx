import { useMemo, useState } from 'react'
import { useSistemas, useVolumenes } from '../lib/datos'
import { normalizar } from '../lib/util'
import { agruparPorSistema, describirLinea, formatLineas, nombreVolumen } from '../lib/volumen'

const describirVolumen = v => v.lineas.map(describirLinea).join('\n')
import EditorVolumen from '../components/EditorVolumen'
import { EncabezadoPagina, IconoVolumenes } from '../components/Iconos'
import Pestanas from '../components/Pestanas'

export default function Volumenes() {
  const sistemas = useSistemas()
  const volumenes = useVolumenes()
  const [sistemaId, setSistemaId] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [editor, setEditor] = useState(null) // { volumen? } | null

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (volumenes ?? [])
      .filter(v => sistemaId === 'todos' || v.sistemaId === sistemaId)
      .filter(v => !q || normalizar(`${v.nombre ?? ''} ${formatLineas(v.lineas)} ${v.observaciones ?? ''}`).includes(q))
      .sort((a, b) => nombreVolumen(a).localeCompare(nombreVolumen(b), 'es', { numeric: true }))
  }, [volumenes, sistemaId, busqueda])

  if (!sistemas || !volumenes) return <p className="text-slate-500">Cargando…</p>

  return (
    <div className="space-y-4">
      <EncabezadoPagina icono={IconoVolumenes} color="violet" titulo="Volúmenes" subtitulo="Series y repeticiones reutilizables en las rutinas (p. ej. 3*10)">
        <button className="btn" onClick={() => setEditor({})}>+ Nuevo volumen</button>
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
        <div className="space-y-6">
          {agruparPorSistema(filtrados, sistemas).map(({ sistema, items }) => (
            <section key={sistema.id}>
              <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {sistema.nombre} <span className="text-xs font-normal normal-case text-slate-400">{items.length} volumen{items.length === 1 ? '' : 'es'}</span>
              </h2>
              <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
                {items.map(v => (
                  <li key={v.id}>
                    <button onClick={() => setEditor({ volumen: v })} title={describirVolumen(v)} className="tarjeta flex h-[78px] w-full flex-col justify-between !p-3 text-left transition hover:border-teal-400 hover:shadow-md">
                      <div className={`truncate text-[13px] font-semibold text-slate-900 ${v.nombre ? '' : 'font-mono'}`}>{nombreVolumen(v)}</div>
                      <div className="truncate font-mono text-xs text-slate-500">{v.nombre ? formatLineas(v.lineas) : `${v.lineas.length} línea${v.lineas.length === 1 ? '' : 's'}`}</div>
                      <div className="flex items-center justify-between"><span className="insignia bg-teal-50 text-teal-700">{v.seriesTotales} series</span><span className="text-[11px] text-slate-400">Ver ›</span></div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {filtrados.length === 0 && <div className="tarjeta text-center text-slate-500">Ningún volumen coincide.</div>}
        </div>
      )}

      {editor && (
        <EditorVolumen volumen={editor.volumen} sistemas={sistemas} onClose={() => setEditor(null)}
          onGuardado={() => setEditor(null)} onBorrado={() => setEditor(null)} />
      )}
    </div>
  )
}
