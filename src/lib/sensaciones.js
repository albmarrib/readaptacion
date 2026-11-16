import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { claveFecha } from './plan'
import { idSesion } from './sesiones'

// Esfuerzo percibido y dolor que el paciente indica al terminar un entreno (opcional).
// Se guarda en la sesión: sensaciones: { esfuerzo: 1-10 | null, zonas: [{ zona, lado, intensidad 0-10 }], nota, fecha }
// Las zonas usan los nombres del dibujo anatómico (react-muscle-highlighter).

export const UMBRAL_AVISO = 7 // dolor a partir del cual se avisa al entrenador (igual en functions/index.js)

export const ZONAS = {
  head: 'Cabeza', neck: 'Cuello', trapezius: 'Trapecio', deltoids: 'Hombro', chest: 'Pecho', 'upper-back': 'Espalda alta',
  'lower-back': 'Lumbar', abs: 'Abdomen', obliques: 'Oblicuo', biceps: 'Bíceps', triceps: 'Tríceps',
  forearm: 'Antebrazo', hands: 'Mano / muñeca', gluteal: 'Glúteo', adductors: 'Aductor', quadriceps: 'Cuádriceps',
  hamstring: 'Isquiotibial', knees: 'Rodilla', calves: 'Gemelo', tibialis: 'Tibial', ankles: 'Tobillo', feet: 'Pie',
}
const LADO = { left: 'izquierda', right: 'derecha', izquierda: 'izquierda', derecha: 'derecha' }
export const nombreZona = z => `${ZONAS[z.zona] ?? z.zona}${z.lado ? ` ${LADO[z.lado]}` : ''}`

// Color según la intensidad (0-10): amarillo suave → rojo intenso
export const colorDolor = n => (n >= 8 ? '#b91c1c' : n >= 6 ? '#ef4444' : n >= 4 ? '#f97316' : n >= 2 ? '#fbbf24' : '#fde68a')
export const claseEsfuerzo = n => (n >= 8 ? 'bg-red-100 text-red-800 border-red-300' : n >= 4 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')

export const dolorMaximo = s => Math.max(0, ...(s?.zonas ?? []).map(z => z.intensidad ?? 0))

// Género del dibujo a partir de la ficha (por defecto, mujer)
export const generoDe = ficha => (ficha?.sexo === 'hombre' ? 'male' : 'female')

// ¿Hay que preguntarle a este paciente? (el entrenador lo puede desactivar en su ficha)
export const preguntarSensaciones = ficha => ficha?.preguntarSensaciones !== false

export async function guardarSensaciones({ pid, rid, dia, esfuerzo, zonas, nota }) {
  const hoy = new Date()
  await setDoc(doc(db, 'pacientes', pid, 'rutinas', rid, 'sesiones', idSesion(hoy, dia)), {
    dia, fecha: claveFecha(hoy), completada: true, actualizado: serverTimestamp(),
    sensaciones: {
      esfuerzo: esfuerzo ?? null,
      zonas: zonas.map(z => ({ zona: z.zona, lado: z.lado ?? null, intensidad: z.intensidad })),
      nota: (nota ?? '').trim().slice(0, 300),
      fecha: serverTimestamp(),
    },
  }, { merge: true })
}
