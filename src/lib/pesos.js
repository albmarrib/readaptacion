// Pesos que anota el paciente en cada línea del volumen.
// Normalmente un número (20 → 20 kg). Si la serie tiene varias partes con pesos distintos
// (p. ej. volumen 12-6-12), se pueden escribir varios separados por guiones: «2-4-2», «7,5-10».
// Un solo peso se guarda como número; varios, como texto «2-4-2». Las gráficas usan el más alto.

const MAX = 1000

// Lee lo que escribe el paciente. Devuelve { valor } (null si está vacío) o { error: true }.
export function leerPeso(texto) {
  const t = String(texto ?? '').trim().replace(/\s*-\s*/g, '-')
  if (t === '') return { valor: null }
  const partes = t.split('-')
  if (partes.length > 8) return { error: true }
  const numeros = partes.map(p => (/^\d+([.,]\d+)?$/.test(p) ? Number(p.replace(',', '.')) : NaN))
  if (numeros.some(n => !Number.isFinite(n) || n < 0 || n > MAX)) return { error: true }
  return { valor: numeros.length === 1 ? numeros[0] : numeros.join('-') }
}

// Números que contiene un peso guardado (número o texto «2-4-2»)
export const numerosPeso = v => (typeof v === 'number' ? [v] : typeof v === 'string' ? v.split('-').map(Number).filter(Number.isFinite) : [])

// El peso más alto de un conjunto de pesos { linea: peso }, para las gráficas (o null si no hay)
export function pesoMaximo(pesos) {
  const v = Object.values(pesos ?? {}).flatMap(numerosPeso)
  return v.length ? Math.max(...v) : null
}

// Cómo se muestra: «20», «7,5», «2-4-2»
export const textoPeso = v => (v == null ? '' : String(v).replace(/\./g, ','))

// Teclado del móvil: el numérico de iPhone no tiene guion, así que allí se usa el normal
export const MODO_TECLADO = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'text' : 'decimal'
