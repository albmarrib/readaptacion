import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePlanPaciente } from '../../lib/planPaciente'
import { diasPrevistos, mismaFecha, soloDia } from '../../lib/plan'
import { estadoEntreno } from '../../lib/sesiones'
import { PuertaPaciente } from '../MiRutina'
import { MesCuadricula, Navegador, SemanaCapsulas, textoMes, textoSemana } from '../../components/paciente/Calendario'
import TarjetaEntreno from '../../components/paciente/TarjetaEntreno'
import { IAgenda, ILista } from '../../components/paciente/IconosPaciente'

const ESTADO = { completado: 'Completado', 'en curso': 'En curso', pendiente: 'Pendiente' }
const fechaLarga = d => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Agenda() {
  return <PuertaPaciente>{pid => <PantallaAgenda pid={pid} />}</PuertaPaciente>
}

function PantallaAgenda({ pid }) {
  const [params] = useSearchParams()
  const inicial = params.get('f') ? soloDia(new Date(params.get('f') + 'T12:00')) : soloDia(new Date())
  const [vista, setVista] = useState('semana')
  const [fecha, setFecha] = useState(inicial)
  const [ancla, setAncla] = useState(inicial)
  const { rutinas, rutina, sesiones, delDia } = usePlanPaciente(pid)

  const mover = paso => {
    const n = new Date(ancla)
    if (vista === 'semana') n.setDate(n.getDate() + 7 * paso)
    else n.setMonth(n.getMonth() + paso, 1)
    setAncla(n)
  }
  const elegir = d => { setFecha(d); setAncla(d) }

  if (!rutinas) return <p className="px-5 pt-6 font-light text-slate-500">Cargando…</p>
  const previstos = rutina ? diasPrevistos(rutina, fecha) : []
  const pasado = soloDia(fecha) < soloDia(new Date())

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between px-5">
        <h1 className="titulo-grande">Agenda</h1>
        <button onClick={() => { setVista(v => (v === 'semana' ? 'mes' : 'semana')); setAncla(fecha) }} aria-label={vista === 'semana' ? 'Ver mes' : 'Ver semana'} className="p-1 text-tinta active:scale-90">
          {vista === 'semana' ? <IAgenda width={38} height={38} /> : <ILista width={36} height={36} />}
        </button>
      </div>

      <div className="mt-8">
        <Navegador texto={vista === 'semana' ? textoSemana(ancla) : textoMes(ancla)} onAnterior={() => mover(-1)} onSiguiente={() => mover(1)} />
        <div className="mt-3">
          {vista === 'semana'
            ? <SemanaCapsulas rutina={rutina} sesiones={sesiones} ancla={ancla} seleccionada={fecha} onElegir={elegir} />
            : <MesCuadricula rutina={rutina} sesiones={sesiones} ancla={ancla} seleccionada={fecha} onElegir={elegir} />}
        </div>
      </div>

      <section className="mt-8 space-y-4 px-5">
        {vista === 'mes' && <p className="text-[15px] font-light text-slate-500 first-letter:uppercase">{mismaFecha(fecha, new Date()) ? 'Hoy' : fechaLarga(fecha)}</p>}
        {!rutina ? (
          <p className="text-[16px] font-light text-slate-500">No tienes una rutina activa ahora mismo.</p>
        ) : previstos.length === 0 ? (
          <p className="text-[17px] font-light text-slate-500">Día de descanso.</p>
        ) : previstos.map(({ dia }) => {
          const estado = estadoEntreno(sesiones, fecha, dia.numero)
          const n = delDia(dia.numero).length
          const texto = estado === 'pendiente' && pasado ? 'No registrado' : ESTADO[estado]
          return <TarjetaEntreno key={dia.numero} to={`/mi-rutina/dia/${dia.numero}`} numero={dia.numero} titulo={dia.titulo || `Día ${dia.numero}`} subtitulo={`${n} ejercicio${n === 1 ? '' : 's'} · ${texto}`} estado={estado} />
        })}
      </section>
    </div>
  )
}
