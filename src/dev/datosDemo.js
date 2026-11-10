// Solo desarrollo (VITE_DEMO=1 y VITE_DEMO_ROL=paciente): datos ficticios del paciente para revisar el diseño.
import { Timestamp } from 'firebase/firestore'
import { claveFecha, soloDia } from '../lib/plan'

const hace = d => { const f = soloDia(new Date()); f.setDate(f.getDate() + d); return f }
const hoy = new Date()

export const rutinaDemo = {
  id: 'demo-r', numero: 2, estado: 'activa', temporada: 2026, semanas: 5,
  notaGeneral: 'Rutina de fuerza enfocada a recuperar la movilidad del hombro y ganar fuerza en el tren superior. Calienta 10 minutos antes de empezar y bebe agua entre series.',
  fechaInicio: Timestamp.fromDate(hace(-12)), fechaFin: Timestamp.fromDate(hace(23)),
  dias: [
    { numero: 1, titulo: 'Tren superior', diaSemana: ((hoy.getDay() + 6) % 7) + 1 },
    { numero: 2, titulo: 'Tren inferior', diaSemana: ((hoy.getDay() + 6 + 2) % 7) + 1 },
    { numero: 3, titulo: 'Core y movilidad', diaSemana: ((hoy.getDay() + 6 + 4) % 7) + 1 },
  ],
}

export const ejerciciosDemo = [
  { id: 'e1', dia: 1, orden: 1, grupoId: 'deltoides', ejercicioId: 'x', nombre: 'Movilidad completa de hombro', lineas: [{ series: 1, tramos: [10] }], seriesTotales: 1, pesos: {}, observaciones: 'Con banda elástica, sin dolor.' },
  { id: 'e2', dia: 1, orden: 2, grupoId: 'dorsal', ejercicioId: 'x', nombre: 'Jalón al pecho', lineas: [{ series: 4, tramos: [10] }], seriesTotales: 4, pesos: { 0: 30 }, observaciones: '' },
  { id: 'e3', dia: 1, orden: 3, grupoId: 'dorsal', ejercicioId: 'x', nombre: 'Pull over en polea', lineas: [{ series: 2, tramos: [10, 8] }, { series: 2, tramos: ['SG'] }], seriesTotales: 4, pesos: {}, observaciones: 'Codos ligeramente flexionados durante todo el recorrido.' },
  { id: 'e4', dia: 1, orden: 4, grupoId: 'pectoral', ejercicioId: 'x', nombre: 'Push up inclinado', lineas: [{ series: 4, tramos: [10] }], seriesTotales: 4, pesos: {}, observaciones: '' },
  { id: 'e5', dia: 2, orden: 1, grupoId: 'piernas', ejercicioId: 'x', nombre: 'Sentadilla goblet', lineas: [{ series: 4, tramos: [12] }], seriesTotales: 4, pesos: {}, observaciones: '' },
]

export const sesionesDemo = [
  { id: `${claveFecha(hace(-5))}_d2`, dia: 2, fecha: claveFecha(hace(-5)), completada: true, hechos: {} },
  { id: `${claveFecha(hace(-3))}_d3`, dia: 3, fecha: claveFecha(hace(-3)), completada: true, hechos: {} },
  { id: `${claveFecha(hoy)}_d1`, dia: 1, fecha: claveFecha(hoy), completada: false, hechos: { e1_0: true } },
]
