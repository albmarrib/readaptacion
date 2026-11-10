import { useCallback, useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { useSesiones } from './sesiones'
import { ejerciciosDemo, rutinaDemo, sesionesDemo } from '../dev/datosDemo'

const VISIBLES = ['activa', 'pendiente', 'cerrada']

// Datos del paciente para su app: sus rutinas (sin borradores), la activa, sus ejercicios y sus sesiones
export function usePlanPaciente(pid) {
  const [rutinas, setRutinas] = useState(null)
  const [ejercicios, setEjercicios] = useState(null)

  useEffect(() => {
    if (!pid) return
    return onSnapshot(query(collection(db, 'pacientes', pid, 'rutinas'), where('estado', 'in', VISIBLES)),
      s => setRutinas(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.numero - a.numero)), () => setRutinas([]))
  }, [pid])

  const rutina = rutinas?.find(r => r.estado === 'activa') ?? null

  useEffect(() => {
    if (!rutina) { setEjercicios(null); return }
    return onSnapshot(collection(db, 'pacientes', pid, 'rutinas', rutina.id, 'ejercicios'),
      s => setEjercicios(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setEjercicios([]))
  }, [pid, rutina?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const sesiones = useSesiones(rutina ? pid : null, rutina?.id)
  const delDia = useCallback(n => (ejercicios ?? []).filter(e => e.dia === n).sort((a, b) => a.orden - b.orden), [ejercicios])

  if (import.meta.env.DEV && pid === 'demo') {
    const dd = n => ejerciciosDemo.filter(e => e.dia === n)
    return { rutinas: [rutinaDemo], rutina: rutinaDemo, ejercicios: ejerciciosDemo, sesiones: sesionesDemo, delDia: dd }
  }
  return { rutinas, rutina, ejercicios, sesiones, delDia }
}
