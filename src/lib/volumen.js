// Notación de volumen "S*R" (ESPECIFICACION.md, 4.2)
//   S = series de la línea (1-99)
//   R = repeticiones por serie: un tramo ("20") o varios con micropausa ("10+8"); cada tramo 1-99
//   Ejemplo: "1*20  2*10+8  3*8+6"  ->  [{series:1,tramos:[20]}, {series:2,tramos:[10,8]}, {series:3,tramos:[8,6]}]

const LINEA = /^(\d{1,2})[*xX×](\d{1,2}(?:\+\d{1,2})*)$/

// Convierte el texto escrito por el entrenador en líneas. Devuelve { lineas } o { error }.
export function parseLineas(texto) {
  const partes = (texto ?? '').trim().split(/[\s,;]+/).filter(Boolean)
  if (!partes.length) return { error: 'Escribe al menos una línea, por ejemplo 3*10' }
  const lineas = []
  for (const p of partes) {
    const m = LINEA.exec(p)
    if (!m) return { error: `«${p}» no es válido. Usa series*repeticiones, por ejemplo 3*10 o 2*10+8` }
    const series = Number(m[1])
    const tramos = m[2].split('+').map(Number)
    if (series < 1 || series > 99) return { error: `En «${p}» las series deben estar entre 1 y 99` }
    if (tramos.some(t => t < 1 || t > 99)) return { error: `En «${p}» cada tramo de repeticiones debe estar entre 1 y 99` }
    lineas.push({ series, tramos })
  }
  return { lineas }
}

export const formatLinea = l => `${l.series}*${l.tramos.join('+')}`
export const formatLineas = ls => (ls ?? []).map(formatLinea).join('  ')

// Series totales del volumen = suma de las series de todas sus líneas
export const seriesTotales = ls => (ls ?? []).reduce((s, l) => s + l.series, 0)

export const repsPorSerie = l => l.tramos.reduce((s, t) => s + t, 0)

const reps = n => `${n} ${n === 1 ? 'repetición' : 'repeticiones'}`

// "2 series · 10 repeticiones, pausa, 8 repeticiones"
export const describirLinea = l =>
  `${l.series} ${l.series === 1 ? 'serie' : 'series'} · ${l.tramos.map(reps).join(', pausa, ')}`

export const nombreVolumen = v => v?.nombre || formatLineas(v?.lineas)

// Los nombres de grupo vienen en mayúsculas del Word: "PECTORAL" -> "Pectoral"
export const tituloGrupo = n => (n ? n.charAt(0) + n.slice(1).toLowerCase() : '')
export const tituloDia = (gruposIds, grupos) =>
  gruposIds.map(id => tituloGrupo(grupos.find(g => g.id === id)?.nombre ?? id)).join(' + ')
