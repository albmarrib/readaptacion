import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

// Escucha una colección entera (solo para colecciones pequeñas). null = cargando.
export function useColeccion(nombre) {
  const [datos, setDatos] = useState(null)
  useEffect(() => onSnapshot(collection(db, nombre),
    s => setDatos(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => { console.error(nombre, e); setDatos([]) }), [nombre])
  return datos
}

export function useGrupos() {
  const d = useColeccion('gruposMusculares')
  return useMemo(() => d && [...d].sort((a, b) => a.orden - b.orden), [d])
}

export function useSistemas() {
  const d = useColeccion('sistemasEntrenamiento')
  return useMemo(() => d && [...d].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [d])
}

export function useVolumenes() {
  return useColeccion('volumenes')
}
