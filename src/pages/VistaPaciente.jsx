import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { VistaPacienteCtx } from '../lib/vistaPaciente'
import MarcoPaciente from '../components/paciente/MarcoPaciente'
import InicioPaciente from './paciente/Inicio'
import Agenda from './paciente/Agenda'
import Rutina, { DiaRutina } from './paciente/Rutina'
import Entreno from './paciente/Entreno'
import Evolucion from './Evolucion'
import { ContenidoRutina, PuertaPaciente } from './MiRutina'

// «Ver como paciente»: las MISMAS pantallas que ve el paciente en su móvil, dentro de un marco de
// teléfono y en solo lectura (no se guarda nada: ni series hechas, ni pesos, ni esfuerzo y dolor).
// El marco usa `transform` para que lo que en el móvil va fijo a la pantalla (menú inferior,
// botón Terminar, fotos a pantalla completa) quede fijo dentro del marco.
export default function VistaPaciente() {
  const { id } = useParams()
  const [ficha, setFicha] = useState(undefined)
  useEffect(() => onSnapshot(doc(db, 'pacientes', id), s => setFicha(s.exists() ? s.data() : null), () => setFicha(null)), [id])
  const vista = useMemo(() => (ficha ? { pid: id, ficha, base: `/pacientes/${id}/vista-paciente`, soloLectura: true } : null), [id, ficha])

  if (ficha === undefined) return <p className="text-slate-500">Cargando…</p>
  if (!ficha) return <p className="rounded-xl bg-red-50 p-3 text-red-700">No se encuentra el paciente.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        <span>👁 Vista previa: así ve la app <b>{ficha.nombre}</b> en su móvil. Solo lectura: no se guarda nada.</span>
        <Link to={`/pacientes/${id}`} className="btn-sec ml-auto !py-1.5">Volver a la ficha</Link>
      </div>
      <VistaPacienteCtx.Provider value={vista}>
        <div className="mx-auto h-[min(820px,calc(100dvh-11rem))] w-full max-w-[400px] overflow-hidden rounded-[2.2rem] border-[6px] border-slate-800 bg-white shadow-xl [transform:translateZ(0)]">
          <div className="h-full overflow-y-auto">
            <Routes>
              <Route element={<MarcoPaciente />}>
                <Route index element={<Navigate to="hoy" replace />} />
                <Route path="hoy" element={<InicioPaciente />} />
                <Route path="agenda" element={<Agenda />} />
                <Route path="mi-rutina" element={<Rutina />} />
                <Route path="mi-rutina/dia/:n" element={<DiaRutina />} />
                <Route path="mi-rutina/historial" element={<div className="px-5 pt-3"><ContenidoRutina pid={id} nombre={ficha.nombre} soloLectura /></div>} />
                <Route path="entreno/:n" element={<Entreno />} />
                <Route path="mi-evolucion" element={<PuertaPaciente>{pid => <Evolucion pid={pid} modoPaciente />}</PuertaPaciente>} />
                <Route path="*" element={<Navigate to="hoy" replace />} />
              </Route>
            </Routes>
          </div>
        </div>
      </VistaPacienteCtx.Provider>
    </div>
  )
}
