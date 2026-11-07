import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { normalizar } from '../lib/util'
import { Avatar, EncabezadoPagina, IconoPacientes } from '../components/Iconos'

const ESTADOS = { invitado: 'Sin acceso', activo: 'Activo', archivado: 'Archivado' }
const COLOR = { invitado: 'bg-amber-50 text-amber-700 ring-amber-200', activo: 'bg-teal-50 text-teal-700 ring-teal-200', archivado: 'bg-slate-100 text-slate-500 ring-slate-200' }

export default function Pacientes() {
  const { perfil, esAdmin } = useAuth()
  const navigate = useNavigate()
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
      <EncabezadoPagina icono={IconoPacientes} color="teal" titulo={esAdmin ? 'Pacientes' : 'Mis pacientes'} subtitulo={pacientes ? `${filtrados.length} ${filtrados.length === 1 ? 'paciente' : 'pacientes'}` : ''}>
        <input className="input w-52" type="search" placeholder="Buscar paciente…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={verArchivados} onChange={e => setVerArchivados(e.target.checked)} /> Archivados</label>
        <Link to="/pacientes/nuevo" className="btn">+ Nuevo paciente</Link>
      </EncabezadoPagina>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {pacientes === null ? <p className="text-slate-500">Cargando…</p>
        : filtrados.length === 0 ? (
          <div className="tarjeta text-center text-slate-500">
            {pacientes.length === 0 ? 'Todavía no hay pacientes. Crea el primero con «Nuevo paciente».' : 'Ningún paciente coincide con la búsqueda.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <table className="w-full text-left">
              <thead className="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-sky-50 text-[11px] font-semibold uppercase tracking-wide text-teal-800">
                <tr>
                  <th className="px-4 py-2">Paciente</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Teléfono</th>
                  {esAdmin && <th className="hidden px-4 py-2.5 lg:table-cell">Entrenador</th>}
                  <th className="px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/pacientes/${p.id}`)} className="cursor-pointer transition hover:bg-teal-50/50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={p.nombre} />
                        <div className="min-w-0">
                          <Link to={`/pacientes/${p.id}`} className="font-medium text-slate-900 hover:text-teal-700">{p.nombre}</Link>
                          <div className="truncate text-xs text-slate-500">{p.email || 'Sin correo'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-2 text-slate-600 md:table-cell">{p.telefono || '—'}</td>
                    {esAdmin && <td className="hidden px-4 py-2 text-slate-600 lg:table-cell">{entrenadores[p.entrenadorId] ?? '—'}</td>}
                    <td className="px-4 py-2"><span className={`insignia ring-1 ring-inset ${COLOR[p.estado] ?? COLOR.invitado}`}>{ESTADOS[p.estado] ?? p.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
