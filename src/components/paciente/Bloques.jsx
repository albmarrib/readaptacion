import { useState } from 'react'
import { tituloGrupo } from '../../lib/volumen'
import { IMas, IMenos } from './IconosPaciente'

// Agrupa los ejercicios del día en bloques por grupo muscular, en el orden en que aparecen
export function agruparEnBloques(delDia, grupos) {
  const bloques = []
  for (const e of delDia) {
    let b = bloques.find(x => x.grupoId === e.grupoId)
    if (!b) { b = { grupoId: e.grupoId, titulo: tituloGrupo(grupos?.find(g => g.id === e.grupoId)?.nombre ?? '') || 'Ejercicios', ejercicios: [] }; bloques.push(b) }
    b.ejercicios.push(e)
  }
  return bloques
}

// Bloque plegable con título en mayúsculas y "+" / "−"
export function Bloque({ titulo, children, abiertoInicial = true }) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  return (
    <section className="mt-6 first:mt-0">
      <button onClick={() => setAbierto(a => !a)} aria-expanded={abierto} className="bloque-titulo">
        {titulo}
        {abierto ? <IMenos width={26} height={26} /> : <IMas width={26} height={26} />}
      </button>
      {abierto && <div className="mt-6">{children}</div>}
    </section>
  )
}

// "6 series | 1*20 · 2*10+8 · 3*SG"
export const resumenVolumen = e => {
  const lineas = (e.lineas ?? []).map(l => `${l.series}*${l.tramos.join('+')}`).join(' · ')
  const n = e.seriesTotales ?? 0
  return `${n} serie${n === 1 ? '' : 's'}${lineas ? `  |  ${lineas}` : ''}`
}
