import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { claveFecha } from './plan'

// Registro de entrenamientos: pacientes/{pid}/rutinas/{rid}/sesiones/{AAAA-MM-DD_dN}
//   { dia: N, fecha: 'AAAA-MM-DD', hechos: { '<idEjercicio>_<línea>': true }, completada: bool, actualizado }
// Una sesión por día de entreno y fecha: si el paciente vuelve el mismo día, continúa la misma.

export const idSesion = (fecha, dia) => `${claveFecha(fecha)}_d${dia}`
export const claveLinea = (ejercicioId, linea) => `${ejercicioId}_${linea}`

const ref = (pid, rid, id) => doc(db, 'pacientes', pid, 'rutinas', rid, 'sesiones', id)

// Todas las sesiones de una rutina, en directo
export function useSesiones(pid, rid) {
  const [sesiones, setSesiones] = useState(null)
  useEffect(() => {
    if (!pid || !rid) return
    return onSnapshot(collection(db, 'pacientes', pid, 'rutinas', rid, 'sesiones'),
      s => setSesiones(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))),
      () => setSesiones([]))
  }, [pid, rid])
  return sesiones
}

// Marca (o desmarca) una línea del volumen como hecha en la sesión de hoy
export async function marcarLinea({ pid, rid, dia, clave, hecho, completada }) {
  const hoy = new Date()
  await setDoc(ref(pid, rid, idSesion(hoy, dia)), {
    dia, fecha: claveFecha(hoy), hechos: { [clave]: hecho }, completada, actualizado: serverTimestamp(),
  }, { merge: true })
}

// Da por terminado el entrenamiento de hoy de ese día
export async function terminarSesion({ pid, rid, dia }) {
  const hoy = new Date()
  await setDoc(ref(pid, rid, idSesion(hoy, dia)), { dia, fecha: claveFecha(hoy), completada: true, actualizado: serverTimestamp() }, { merge: true })
}

// Sesión de hoy para un día de entreno (o null)
export const sesionDeHoy = (sesiones, dia) => (sesiones ?? []).find(s => s.id === idSesion(new Date(), dia)) ?? null

// Cuántas líneas hay hechas en una sesión
export const lineasHechas = s => Object.values(s?.hechos ?? {}).filter(Boolean).length

// Marca una línea y, si con ella quedan hechas todas las del día, da la sesión por completada
export async function marcarLineaDia({ pid, rid, dia, delDia, sesion, ejercicioId, linea, hecho }) {
  const clave = claveLinea(ejercicioId, linea)
  const hechos = { ...(sesion?.hechos ?? {}), [clave]: hecho }
  const todas = delDia.length > 0 && delDia.every(x => (x.lineas ?? []).every((_, k) => hechos[claveLinea(x.id, k)]))
  await marcarLinea({ pid, rid, dia, clave, hecho, completada: todas })
}
