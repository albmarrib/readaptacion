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
    <section className="tarjeta">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Rutinas</h2>
        <Link to={`/pacientes/${pacienteId}/rutinas/nueva`} className="btn btn-xs">+ Nueva</Link>
      </div>
      {rutinas?.some(x => x.estado !== 'borrador') && (
        <div className="mb-3 flex gap-2">
          <Link to={`/pacientes/${pacienteId}/vista-paciente`} className="btn-sec btn-xs flex-1">Ver como paciente</Link>
          <Link to={`/pacientes/${pacienteId}/evolucion`} className="btn-sec btn-xs flex-1">Evolución</Link>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rutinas === null ? <p className="text-sm text-slate-500">Cargando…</p>
        : rutinas.length === 0 ? <p className="text-sm text-slate-500">Este paciente todavía no tiene rutinas.</p>
          : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {rutinas.map(r => (
                <li key={r.id}>
                  <Link to={`/pacientes/${pacienteId}/rutinas/${r.id}`} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
                    <div>
                      <div className="text-sm font-medium">Rutina {r.numero} <span className="font-normal text-slate-500">· {r.temporada}</span></div>
                      <div className="text-xs text-slate-500">{r.dias?.length ?? 0} día{r.dias?.length === 1 ? '' : 's'}/sem · {r.semanas} semanas</div>
                    </div>
                    <span className={`insignia shrink-0 ${COLOR[r.estado]}`}>{ESTADOS[r.estado]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
    </section>
  )
}
