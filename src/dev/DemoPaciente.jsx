// Solo desarrollo (VITE_DEMO=1): piezas de la app del paciente con datos ficticios para revisar el diseño.
import { useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { FilaEjercicio, DetalleEjercicio } from '../pages/MiRutina'
import Calendario from '../components/Calendario'
import Descanso from '../components/Descanso'
import { claveFecha, soloDia } from '../lib/plan'
import { claveLinea } from '../lib/sesiones'

const ejercicios = [
  { id: 'a', ejercicioId: 'x1', nombre: 'PRESS BANCA CON MANCUERNAS', lineas: [{ series: 1, tramos: [20] }, { series: 2, tramos: [10, 8] }, { series: 3, tramos: ['SG'] }], seriesTotales: 6, pesos: { 0: 20, 1: 24 }, observaciones: 'Baja despacio (3 segundos) y no bloquees los codos arriba.' },
  { id: 'b', ejercicioId: 'x2', nombre: 'APERTURAS EN POLEA\nCON AGARRE NEUTRO', lineas: [{ series: 3, tramos: [12] }], seriesTotales: 3, pesos: { 0: 10 }, observaciones: '' },
  { id: 'c', ejercicioId: 'x3', nombre: 'FLEXIONES DE JUDO', lineas: [{ series: 4, tramos: [10, 5] }, { series: 2, tramos: [15] }], seriesTotales: 6, pesos: {}, observaciones: 'Descanso de 90 segundos entre series.' },
]
const hace = d => { const f = soloDia(new Date()); f.setDate(f.getDate() + d); return f }
const rutina = { id: 'r', numero: 2, dias: [{ numero: 1, titulo: 'Pectoral' }, { numero: 2, titulo: 'Dorsal' }, { numero: 3, titulo: 'Pierna' }], fechaInicio: Timestamp.fromDate(hace(-12)), fechaFin: Timestamp.fromDate(hace(23)) }
const sesiones = [{ id: 's1', fecha: claveFecha(hace(-5)), completada: true }, { id: 's2', fecha: claveFecha(hace(-3)), completada: true }, { id: 's3', fecha: claveFecha(hace(-1)), completada: false }]

export default function DemoPaciente() {
  const [abierto, setAbierto] = useState(null)
  const [fecha, setFecha] = useState(soloDia(new Date()))
  const [hechos, setHechos] = useState({})
  const [descanso, setDescanso] = useState(false)
  const i = ejercicios.findIndex(e => e.id === abierto)
  return (
    <div className="mx-auto max-w-md space-y-3 p-4">
      <Calendario rutina={rutina} sesiones={sesiones} seleccionada={fecha} onElegir={setFecha} />
      <button className="btn" onClick={() => setDescanso(true)}>Probar descanso</button>
      <h2 className="text-lg font-bold">Día 1 · Pectoral</h2>
      <ul className="space-y-2.5">{ejercicios.map((e, k) => <FilaEjercicio key={e.id} ejercicio={e} numero={k + 1} puedeAnotar onAbrir={() => setAbierto(e.id)} />)}</ul>
      {i >= 0 && <DetalleEjercicio pid="demo" rid="demo" ejercicio={ejercicios[i]} numero={i + 1} total={ejercicios.length} puedeAnotar
        sesion={{ hechos }} onMarcar={(l, v) => setHechos(h => ({ ...h, [claveLinea(ejercicios[i].id, l)]: v }))} onTerminar={() => setAbierto(null)}
        onCerrar={() => setAbierto(null)}
        onAnterior={i > 0 ? () => setAbierto(ejercicios[i - 1].id) : null} onSiguiente={i < ejercicios.length - 1 ? () => setAbierto(ejercicios[i + 1].id) : null} />}
      {descanso && <Descanso onCerrar={() => setDescanso(false)} />}
    </div>
  )
}
