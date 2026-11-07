import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { normalizar } from '../lib/util'

const ESTADOS = { invitado: 'Sin acceso aún', activo: 'Activo', archivado: 'Archivado' }
const COLOR = { invitado: 'bg-amber-100 text-amber-800', activo: 'bg-teal-100 text-teal-800', archivado: 'bg-slate-200 text-slate-600' }

export default function Pacientes() {
  const { perfil, esAdmin } = useAuth()
  const [pacientes, setPacientes] = useState(null)
  const [entrenadores, setEntrenadores] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const [verArchivados, setVerArchivados] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const base = collection(db, 'pacientes')
    const q = esAdmin ? base : query(base, where('entrenadorId', '==', perfil.uid))
    return onSnapshot(q,
      s => setPacientes(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => setError('No se pudieron cargar los pacientes: ' + e.message))
  }, [esAdmin, perfil.uid])

  useEffect(() => {
    if (!esAdmin) return
    getDocs(collection(db, 'usuarios')).then(s => setEntrenadores(Object.fromEntries(s.docs.map(d => [d.id, d.data().nombre]))))
  }, [esAdmin])

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return (pacientes ?? [])
      .filter(p => verArchivados || p.estado !== 'archivado')
      .filter(p => !q || normalizar(`${p.nombre} ${p.email ?? ''} ${p.telefono ?? ''}`).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [pacientes, busqueda, verArchivados])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{esAdmin ? 'Todos los pacientes' : 'Mis pacientes'}</h1>
        <Link to="/pacientes/nuevo" className="btn ml-auto">+ Nuevo paciente</Link>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <input className="input sm:max-w-sm" type="search" placeholder="Buscar por nombre, correo o teléfono…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={verArchivados} onChange={e => setVerArchivados(e.target.checked)} /> Ver archivados
        </label>
      </div>

      {pacientes === null ? <p className="text-slate-500">Cargando…</p>
        : filtrados.length === 0 ? (
          <div className="tarjeta text-center text-slate-500">
            {pacientes.length === 0 ? 'Todavía no hay pacientes. Crea el primero con «Nuevo paciente».' : 'Ningún paciente coincide con la búsqueda.'}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtrados.map(p => (
              <li key={p.id}>
                <Link to={`/pacientes/${p.id}`} className="tarjeta block hover:border-teal-500">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.nombre}</div>
                      <div className="truncate text-sm text-slate-500">{p.email || 'Sin correo'}{p.telefono ? ` · ${p.telefono}` : ''}</div>
                      {esAdmin && <div className="mt-1 text-xs text-slate-400">Entrenador: {entrenadores[p.entrenadorId] ?? '—'}</div>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR[p.estado] ?? COLOR.invitado}`}>{ESTADOS[p.estado] ?? p.estado}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
