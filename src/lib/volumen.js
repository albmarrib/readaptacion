// Notación de volumen "S*R" (ESPECIFICACION.md, 4.2)
//   S = series de la línea (1-99). Siempre un número: es lo que se suma para el esfuerzo.
//   R = lo que se hace en cada serie: uno o varios tramos separados por "+" (micropausa).
//       Cada tramo es un número de repeticiones (1-99) o un texto corto (hasta 12 caracteres) con
//       letras, números y los signos ( ) / - +, por ejemplo SG (serie gigante), F (fallo), AMRAP,
//       8-12 (rango), 10/8/6, 12(2) o (6+6). Un + fuera de paréntesis separa tramos (micropausa);
//       dentro de paréntesis es parte del texto.
//   Ejemplo: "2*10  1*8+4  3*SG"  ->  [{series:2,tramos:[10]}, {series:1,tramos:[8,4]}, {series:3,tramos:['SG']}]
//   Series totales: 2+1+3 = 6 (las abreviaturas no afectan al cálculo).

const LINEA = /^(\d{1,2})[*×](.+)$/
const NUMERO = /^\d{1,2}$/
// Texto libre corto: al menos una letra o un número, y solo letras, números y ( ) / - +
const TEXTO = /^(?=.*[A-Za-zÀ-ÿ0-9])[A-Za-zÀ-ÿ0-9()/+-]{1,12}$/

// Separa los tramos por los + que no están dentro de paréntesis
function separarTramos(r) {
  const tramos = []
  let actual = '', nivel = 0
  for (const ch of r) {
    if (ch === '(') nivel++
    if (ch === ')') nivel = Math.max(0, nivel - 1)
    if (ch === '+' && nivel === 0) { tramos.push(actual); actual = '' } else actual += ch
  }
  tramos.push(actual)
  return tramos
}

// Convierte el texto escrito por el entrenador en líneas. Devuelve { lineas } o { error }.
export function parseLineas(texto) {
  const partes = (texto ?? '').trim().split(/[\s,;]+/).filter(Boolean)
  if (!partes.length) return { error: 'Escribe al menos una línea, por ejemplo 3*10' }
  const lineas = []
  for (const p of partes) {
    // Se admite también "x" como separador (3x10), salvo que vaya seguida de letras (3xSG se lee igual)
    const m = LINEA.exec(p) ?? /^(\d{1,2})[xX](.+)$/.exec(p)
    if (!m) return { error: `«${p}» no es válido. Usa series*repeticiones, por ejemplo 3*10, 2*10+8, 3*SG o 3*8-12` }
    const series = Number(m[1])
    if (series < 1 || series > 99) return { error: `En «${p}» las series deben estar entre 1 y 99` }
    const tramos = []
    for (const t of separarTramos(m[2])) {
      if (NUMERO.test(t)) {
        const n = Number(t)
        if (n < 1 || n > 99) return { error: `En «${p}» cada tramo de repeticiones debe estar entre 1 y 99` }
        tramos.push(n)
      } else if (TEXTO.test(t) && t.split('(').length === t.split(')').length) tramos.push(t.toUpperCase())
      else return { error: `En «${p}», «${t}» no es válido: usa un número (1-99) o un texto corto (hasta 12 caracteres) con letras, números y ( ) / - +, por ejemplo SG, 8-12 o 10/8` }
    }
    lineas.push({ series, tramos })
  }
  return { lineas }
}

export const formatLinea = l => `${l.series}*${l.tramos.join('+')}`
export const formatLineas = ls => (ls ?? []).map(formatLinea).join('  ')

// Series totales del volumen = suma de las series de todas sus líneas
export const seriesTotales = ls => (ls ?? []).reduce((s, l) => s + l.series, 0)

// Repeticiones por serie: solo cuentan los tramos numéricos
export const repsPorSerie = l => l.tramos.reduce((s, t) => s + (typeof t === 'number' ? t : 0), 0)

const reps = n => (typeof n === 'number' ? `${n} ${n === 1 ? 'repetición' : 'repeticiones'}` : n)

// "2 series · 10 repeticiones, pausa, 8 repeticiones"  ·  "3 series · SG"
export const describirLinea = l =>
  `${l.series} ${l.series === 1 ? 'serie' : 'series'} · ${l.tramos.map(reps).join(', pausa, ')}`

export const nombreVolumen = v => v?.nombre || formatLineas(v?.lineas)

// Los nombres de grupo vienen en mayúsculas del Word: "PECTORAL" -> "Pectoral"
export const tituloGrupo = n => (n ? n.charAt(0) + n.slice(1).toLowerCase() : '')
export const tituloDia = (gruposIds, grupos) =>
  gruposIds.map(id => tituloGrupo(grupos.find(g => g.id === id)?.nombre ?? id)).join(' + ')

// Agrupa volúmenes por sistema de entrenamiento (en el orden de la lista de sistemas)
export function agruparPorSistema(volumenes, sistemas) {
  const grupos = sistemas
    .map(s => ({ sistema: s, items: volumenes.filter(v => v.sistemaId === s.id) }))
    .filter(g => g.items.length)
  const huerfanos = volumenes.filter(v => !sistemas.some(s => s.id === v.sistemaId))
  if (huerfanos.length) grupos.push({ sistema: { id: '?', nombre: 'Sin sistema' }, items: huerfanos })
  return grupos
}
