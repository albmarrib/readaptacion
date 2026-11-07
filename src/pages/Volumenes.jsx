import { useMemo, useState } from 'react'
import { useSistemas, useVolumenes } from '../lib/datos'
import { normalizar } from '../lib/util'
import { agruparPorSistema, describirLinea, formatLineas, nombreVolumen } from '../lib/volumen'
import EditorVolumen from '../components/EditorVolumen'

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
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="titulo-pagina">Volúmenes</h1>
        <button className="btn ml-auto" onClick={() => setEditor({})}>+ Nuevo volumen</button>
      </div>
      <p className="text-sm text-slate-500">Un volumen es la prescripción de series y repeticiones (p. ej. <span className="font-mono">3*10</span>). Se guardan aquí para reutilizarlos en las rutinas.</p>

      {volumenes.length > 0 && (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {[{ id: 'todos', nombre: 'Todos' }, ...sistemas].map(s => (
              <button key={s.id} onClick={() => setSistemaId(s.id)}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${s.id === sistemaId ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
                {s.nombre}
              </button>
            ))}
          </div>
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
              <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {items.map(v => (
                  <li key={v.id}>
                    <button onClick={() => setEditor({ volumen: v })} className="tarjeta block w-full !p-3 text-left hover:border-teal-500">
                      <div className="font-medium">{nombreVolumen(v)}</div>
                      {v.nombre && <div className="font-mono text-sm text-slate-600">{formatLineas(v.lineas)}</div>}
                      <ul className="mt-1 text-xs text-slate-500">{v.lineas.map((l, i) => <li key={i}>{describirLinea(l)}</li>)}</ul>
                      <div className="mt-1.5 text-xs font-medium text-teal-800">{v.seriesTotales} series en total</div>
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
