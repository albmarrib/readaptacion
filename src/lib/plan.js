// Calendario de la rutina: qué día de la semana toca cada día de entreno.
// Los días de la semana van de 1 (lunes) a 7 (domingo).

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Reparto por defecto si el entrenador no elige días: lo más espaciado posible
const REPARTO = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] }
export const repartoPorDefecto = n => REPARTO[n] ?? []

// Día de la semana (1-7) del día i de la rutina (elegido por el entrenador o el reparto por defecto)
export const diaSemanaDe = (rutina, i) => rutina.dias[i]?.diaSemana ?? repartoPorDefecto(rutina.dias.length)[i] ?? null

export const isoSemana = d => ((d.getDay() + 6) % 7) + 1
export const soloDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const aFecha = t => (t?.toDate ? t.toDate() : t ? new Date(t) : null)
export const claveFecha = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const mismaFecha = (a, b) => a && b && claveFecha(a) === claveFecha(b)

// Días de la rutina previstos para una fecha (solo dentro del periodo de la rutina activa)
export function diasPrevistos(rutina, fecha) {
  const ini = aFecha(rutina?.fechaInicio), fin = aFecha(rutina?.fechaFin)
  if (!ini || !fin) return []
  const f = soloDia(fecha)
  if (f < soloDia(ini) || f >= soloDia(fin)) return []
  const w = isoSemana(f)
  return rutina.dias.map((dia, i) => ({ dia, i })).filter(({ i }) => diaSemanaDe(rutina, i) === w)
}

// Próxima fecha con entreno, desde hoy (incluido)
export function proximoEntreno(rutina, desde = new Date()) {
  for (let k = 0; k < 21; k++) {
    const f = soloDia(desde); f.setDate(f.getDate() + k)
    const previstos = diasPrevistos(rutina, f)
    if (previstos.length) return { fecha: f, previstos }
  }
  return null
}

// Lunes de la semana de una fecha
export function lunesDe(fecha) {
  const f = soloDia(fecha)
  f.setDate(f.getDate() - (isoSemana(f) - 1))
  return f
}

export const saludo = (d = new Date()) => (d.getHours() < 13 ? 'Buenos días' : d.getHours() < 21 ? 'Buenas tardes' : 'Buenas noches')
