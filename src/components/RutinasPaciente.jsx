import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

const ESTADOS = { borrador: 'Borrador', activa: 'Activa', pendiente: 'Pendiente de revisión', cerrada: 'Cerrada' }
const COLOR = { borrador: 'bg-slate-200 text-slate-700', activa: 'bg-teal-100 text-teal-800', pendiente: 'bg-amber-100 text-amber-800', cerrada: 'bg-slate-300 text-slate-700' }

// Histórico de rutinas del paciente (ficha del paciente)
export default function RutinasPaciente({ pacienteId }) {
  const [rutinas, setRutinas] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => onSnapshot(collection(db, 'pacientes', pacienteId, 'rutinas'),
    s => setRutinas(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.numero - a.numero)),
    e => setError('No se pudieron cargar las rutinas: ' + e.message)), [pacienteId])

  return (
    <section className="tarjeta space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Rutinas</h2>
        <Link to={`/pacientes/${pacienteId}/rutinas/nueva`} className="btn !py-2">+ Nueva rutina</Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rutinas === null ? <p className="text-sm text-slate-500">Cargando…</p>
        : rutinas.length === 0 ? <p className="text-sm text-slate-500">Este paciente todavía no tiene rutinas.</p>
          : (
            <ul className="space-y-2">
              {rutinas.map(r => (
                <li key={r.id}>
                  <Link to={`/pacientes/${pacienteId}/rutinas/${r.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-teal-500">
                    <div>
                      <div className="font-medium">Rutina {r.numero} · temporada {r.temporada}</div>
                      <div className="text-xs text-slate-500">{r.dias?.length ?? 0} día{r.dias?.length === 1 ? '' : 's'} por semana · {r.semanas} semanas</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR[r.estado]}`}>{ESTADOS[r.estado]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
    </section>
  )
}
