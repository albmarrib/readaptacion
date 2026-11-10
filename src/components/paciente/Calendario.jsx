import { DIAS_CORTOS, claveFecha, diasPrevistos, lunesDe, mismaFecha, soloDia } from '../../lib/plan'
import { IChevronDer, IChevronIzq } from './IconosPaciente'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Marca de un día: entreno hecho (verde), empezado (ámbar) o previsto (verde azulado)
export function marcaDia(rutina, sesiones, d) {
  const delDia = (sesiones ?? []).filter(s => s.fecha === claveFecha(d))
  if (delDia.some(s => s.completada)) return 'hecho'
  if (delDia.length) return 'empezado'
  return rutina && diasPrevistos(rutina, d).length ? 'previsto' : null
}
const COLOR = { hecho: 'bg-emerald-500', empezado: 'bg-amber-400', previsto: 'bg-teal-500' }

export function Punto({ marca, sobreOscuro }) {
  if (!marca) return <span className="h-1.5 w-1.5" />
  return <span className={`h-1.5 w-1.5 rounded-full ${marca === 'previsto' && sobreOscuro ? 'bg-teal-300' : COLOR[marca]}`} />
}

// Cabecera con flechas para cambiar de semana o de mes
export function Navegador({ texto, onAnterior, onSiguiente }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <button onClick={onAnterior} aria-label="Anterior" className="p-2 text-tinta active:scale-90"><IChevronIzq width={28} height={28} /></button>
      <span className="text-[17px] font-medium tracking-wide text-tinta">{texto}</span>
      <button onClick={onSiguiente} aria-label="Siguiente" className="p-2 text-tinta active:scale-90"><IChevronDer width={28} height={28} /></button>
    </div>
  )
}

// Semana en cápsulas verticales
export function SemanaCapsulas({ rutina, sesiones, ancla, seleccionada, onElegir }) {
  const lunes = lunesDe(ancla)
  const dias = Array.from({ length: 7 }, (_, k) => { const d = new Date(lunes); d.setDate(lunes.getDate() + k); return d })
  return (
    <div className="grid grid-cols-7 gap-1.5 px-4">
      {dias.map((d, k) => {
        const sel = mismaFecha(d, seleccionada)
        const hoy = mismaFecha(d, new Date())
        return (
          <button key={d.toISOString()} onClick={() => onElegir(d)}
            className={`flex h-[5.6rem] flex-col items-center justify-center gap-1.5 rounded-full border transition active:scale-95 ${sel ? 'border-tinta bg-tinta text-white' : `bg-white/40 text-tinta ${hoy ? 'border-tinta border-2' : 'border-tinta/60'}`}`}>
            <span className={`text-[15px] ${sel ? 'font-light text-white/90' : 'font-light'}`}>{DIAS_CORTOS[k]}</span>
            <span className="text-[19px] font-semibold tabular-nums">{String(d.getDate()).padStart(2, '0')}</span>
            <Punto marca={marcaDia(rutina, sesiones, d)} sobreOscuro={sel} />
          </button>
        )
      })}
    </div>
  )
}

// Mes completo en cuadrícula
export function MesCuadricula({ rutina, sesiones, ancla, seleccionada, onElegir }) {
  const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1)
  const ini = lunesDe(primero)
  const dias = Array.from({ length: 42 }, (_, k) => { const d = new Date(ini); d.setDate(ini.getDate() + k); return d })
  return (
    <div className="px-4">
      <div className="grid grid-cols-7 pb-4 text-center text-[15px] font-semibold text-tinta">{DIAS_CORTOS.map(d => <span key={d}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-5 text-center">
        {dias.map(d => {
          const fuera = d.getMonth() !== ancla.getMonth()
          const sel = mismaFecha(d, seleccionada)
          return (
            <button key={d.toISOString()} onClick={() => onElegir(d)} className="flex flex-col items-center gap-1.5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full text-[19px] tabular-nums ${sel ? 'bg-tinta font-semibold text-white' : fuera ? 'font-medium text-slate-300' : 'font-semibold text-tinta'}`}>{d.getDate()}</span>
              {!fuera ? <Punto marca={marcaDia(rutina, sesiones, d)} /> : <span className="h-1.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const textoSemana = ancla => {
  const l = lunesDe(ancla), dom = new Date(l); dom.setDate(l.getDate() + 6)
  return `${MESES[dom.getMonth()]} ${dom.getFullYear()} - Semana ${l.getDate()} al ${dom.getDate()}`
}
export const textoMes = ancla => `${MESES[ancla.getMonth()]} ${ancla.getFullYear()}`
export const hoySolo = () => soloDia(new Date())
