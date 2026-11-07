import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { normalizar } from '../lib/util'
import { tituloGrupo } from '../lib/volumen'
import Foto from './Foto'
import Modal from './Modal'

const cache = new Map() // grupoId -> ejercicios

async function cargar(grupoId) {
  if (cache.has(grupoId)) return cache.get(grupoId)
  const s = await getDocs(query(collection(db, 'ejercicios'), where('grupoId', '==', grupoId)))
  const lista = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.orden - b.orden)
  cache.set(grupoId, lista)
  return lista
}

const POR_PAGINA = 50

// Elige ejercicios de los grupos del día. Se pueden marcar varios y añadirlos de una vez.
export default function SelectorEjercicios({ grupos, gruposDia, onClose, onAnadir }) {
  const [grupoId, setGrupoId] = useState(gruposDia[0])
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [visibles, setVisibles] = useState(POR_PAGINA)
  const [marcados, setMarcados] = useState(new Map()) // id -> ejercicio (se conserva al cambiar de grupo)

  useEffect(() => {
    let vivo = true
    setCargando(true); setBusqueda(''); setVisibles(POR_PAGINA)
    cargar(grupoId).then(l => { if (vivo) { setLista(l); setCargando(false) } }).catch(() => vivo && setCargando(false))
    return () => { vivo = false }
  }, [grupoId])

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return q ? lista.filter(e => normalizar(e.nombre).includes(q)) : lista
  }, [lista, busqueda])

  const alternar = e => setMarcados(m => { const n = new Map(m); n.has(e.id) ? n.delete(e.id) : n.set(e.id, e); return n })

  return (
    <Modal titulo="Añadir ejercicios" onClose={onClose} ancho="max-w-3xl">
      <div className="space-y-3">
        {gruposDia.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gruposDia.map(id => (
              <button key={id} onClick={() => setGrupoId(id)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${id === grupoId ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
                {tituloGrupo(grupos.find(g => g.id === id)?.nombre)}
              </button>
            ))}
          </div>
        )}
        <input className="input" type="search" autoFocus placeholder="Buscar ejercicio…" value={busqueda} onChange={e => { setBusqueda(e.target.value); setVisibles(POR_PAGINA) }} />
        <p className="text-sm text-slate-500">{cargando ? 'Cargando…' : `${filtrados.length} ejercicio${filtrados.length === 1 ? '' : 's'}`}</p>

        <ul className="grid gap-2 sm:grid-cols-2">
          {filtrados.slice(0, visibles).map(e => {
            const sel = marcados.has(e.id)
            const [titulo, ...resto] = e.nombre.split('\n').filter(Boolean)
            return (
              <li key={e.id}>
                <button type="button" onClick={() => alternar(e)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left ${sel ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-400'}`}>
                  {e.fotos?.[0] ? <Foto ruta={e.fotos[0]} className="h-16 w-20 shrink-0 rounded-lg" /> : <div className="h-16 w-20 shrink-0 rounded-lg bg-slate-100" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug">{titulo}</div>
                    {resto.length > 0 && <div className="line-clamp-1 text-xs text-slate-500">{resto.join(' · ')}</div>}
                  </div>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm ${sel ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                </button>
              </li>
            )
          })}
        </ul>
        {filtrados.length > visibles && <button className="btn-sec w-full" onClick={() => setVisibles(v => v + POR_PAGINA)}>Ver más</button>}

        <div className="sticky bottom-0 -mx-5 -mb-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <span className="text-sm text-slate-600">{marcados.size} seleccionado{marcados.size === 1 ? '' : 's'}</span>
          <button className="btn" disabled={!marcados.size} onClick={() => onAnadir([...marcados.values()])}>Añadir al día</button>
        </div>
      </div>
    </Modal>
  )
}
