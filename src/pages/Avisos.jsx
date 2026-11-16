import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { useAvisos } from '../lib/datos'
import { EncabezadoPagina, IconoAvisos } from '../components/Iconos'

const fmt = t => t?.toDate?.().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Avisos() {
  const { perfil } = useAuth()
  const avisos = useAvisos(perfil.uid)
  const [pacientes, setPacientes] = useState({}) // id -> { nombre, telefono }

  useEffect(() => {
    if (!avisos) return
    const faltan = [...new Set(avisos.map(a => a.pacienteId))].filter(id => !(id in pacientes))
    if (!faltan.length) return
    Promise.all(faltan.map(id => getDoc(doc(db, 'pacientes', id)).then(s => [id, s.exists() ? s.data() : null]).catch(() => [id, null])))
      .then(r => setPacientes(p => ({ ...p, ...Object.fromEntries(r) })))
  }, [avisos]) // eslint-disable-line react-hooks/exhaustive-deps

  const marcar = (a, leido = true) => updateDoc(doc(db, 'avisos', a.id), { leido })
  const marcarTodos = async () => {
    const lote = writeBatch(db)
    avisos.filter(a => !a.leido).forEach(a => lote.update(doc(db, 'avisos', a.id), { leido: true }))
    await lote.commit()
  }

  if (!avisos) return <p className="text-slate-500">Cargando…</p>
  const sinLeer = avisos.filter(a => !a.leido).length

  return (
    <div className="space-y-4">
      <EncabezadoPagina icono={IconoAvisos} color="amber" titulo="Avisos" subtitulo={sinLeer ? `${sinLeer} sin leer` : 'Todo al día'}>
        {sinLeer > 0 && <button className="btn-sec" onClick={marcarTodos}>Marcar todos como leídos</button>}
      </EncabezadoPagina>
      {avisos.length === 0 ? <div className="tarjeta text-center text-slate-500">No tienes avisos. Aquí aparecerán las rutinas que lleguen a su fin y los dolores altos que marquen tus pacientes.</div> : (
        <ul className="space-y-3">
          {avisos.map(a => {
            const p = pacientes[a.pacienteId]
            const dolor = a.tipo === 'dolor_alto'
            return (
              <li key={a.id} className={`tarjeta flex items-center gap-3 !p-3 ${a.leido ? 'opacity-70' : dolor ? 'border-red-400' : 'border-teal-500'}`}>
                {!a.leido && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dolor ? 'bg-red-500' : 'bg-teal-600'}`} aria-label="Sin leer" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{dolor ? `${p?.nombre ?? 'Un paciente'} ha marcado dolor ${a.dolorMaximo}/10` : `La rutina de ${p?.nombre ?? 'un paciente'} ha terminado`}</div>
                  <div className="text-sm text-slate-500">{dolor ? 'Al terminar su entreno' : 'Requiere revisión'} · {fmt(a.fecha)}</div>
                </div>
                <Link to={dolor ? `/pacientes/${a.pacienteId}/evolucion` : `/pacientes/${a.pacienteId}/rutinas/${a.rutinaId}`} onClick={() => !a.leido && marcar(a)} className="btn btn-xs">{dolor ? 'Ver' : 'Revisar'}</Link>
                {a.leido && <button className="text-sm text-slate-500 underline" onClick={() => marcar(a, false)}>No leído</button>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
