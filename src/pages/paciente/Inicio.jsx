import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { usePlanPaciente } from '../../lib/planPaciente'
import { DIAS_SEMANA, claveFecha, diasPrevistos, isoSemana, lunesDe, mismaFecha, proximoEntreno, saludo, soloDia } from '../../lib/plan'
import { ejercicioHecho, estadoEntreno, sesionDeHoy } from '../../lib/sesiones'
import { PuertaPaciente } from '../MiRutina'
import { SemanaCapsulas } from '../../components/paciente/Calendario'
import TarjetaEntreno from '../../components/paciente/TarjetaEntreno'
import BienvenidaApp from '../../components/BienvenidaApp'

const fechaLarga = d => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const ESTADO = { completado: 'Completado', 'en curso': 'En curso', pendiente: 'Pendiente' }

export default function Inicio() {
  return <PuertaPaciente>{pid => <PantallaInicio pid={pid} />}</PuertaPaciente>
}

function PantallaInicio({ pid }) {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { rutinas, rutina, sesiones, delDia } = usePlanPaciente(pid)
  const hoy = soloDia(new Date())
  const nombre = perfil.nombre.split(' ')[0]

  if (!rutinas) return <p className="px-5 pt-6 font-light text-slate-500">Cargando…</p>

  const previstos = rutina ? diasPrevistos(rutina, hoy) : []
  // Barra de progreso del plan de hoy: un tramo por ejercicio
  const ejerciciosHoy = previstos.flatMap(({ dia }) => delDia(dia.numero).map(e => ({ e, dia: dia.numero })))
  const hechosHoy = ejerciciosHoy.filter(({ e, dia }) => ejercicioHecho(sesionDeHoy(sesiones, dia), e)).length
  const proximo = rutina ? proximoEntreno(rutina, new Date(hoy.getTime() + 86400000)) : null

  // Entrenos de esta semana: previstos y hechos
  const lunes = lunesDe(hoy)
  const semana = Array.from({ length: 7 }, (_, k) => { const d = new Date(lunes); d.setDate(lunes.getDate() + k); return d })
  const previstosSemana = rutina ? semana.reduce((s, d) => s + diasPrevistos(rutina, d).length, 0) : 0
  const hechosSemana = (sesiones ?? []).filter(s => s.completada && semana.some(d => claveFecha(d) === s.fecha)).length

  return (
    <div className="px-5 pt-3">
      <h1 className="titulo-grande">{saludo()},<br /><span className="font-normal">{nombre}</span></h1>
      <p className="mt-2 text-[16px] font-light tracking-wide text-slate-500 first-letter:uppercase">{fechaLarga(hoy)}</p>
      <div className="mt-6"><BienvenidaApp plano /></div>

      <section className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[28px] font-light tracking-tight">Plan de hoy</h2>
          <Link to="/agenda" className="text-[14px] font-light text-tinta underline underline-offset-4">Ver agenda</Link>
        </div>
        {ejerciciosHoy.length > 0 && (
          <div className="mt-3 flex gap-1.5" aria-label={`${hechosHoy} de ${ejerciciosHoy.length} ejercicios hechos`}>
            {ejerciciosHoy.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < hechosHoy ? 'bg-emerald-500' : 'bg-slate-300/70'}`} />)}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {!rutina ? (
            <p className="border border-tinta/40 bg-white/60 p-5 text-[16px] font-light leading-relaxed">
              {rutinas.length ? 'Tu rutina ha terminado. Tu entrenador está preparando la siguiente.' : 'Cuando tu entrenador te prepare una rutina, la verás aquí.'}
            </p>
          ) : previstos.length === 0 ? (
            <div className="border border-tinta/40 bg-white/60 p-5">
              <p className="text-[20px] font-light">Hoy toca descansar</p>
              {proximo && (
                <p className="mt-1.5 text-[15px] font-light text-slate-500">
                  Próximo entreno: <span className="capitalize text-tinta">{mismaFecha(proximo.fecha, new Date(hoy.getTime() + 86400000)) ? 'mañana' : DIAS_SEMANA[isoSemana(proximo.fecha) - 1].toLowerCase()}</span> · {proximo.previstos[0].dia.titulo || `Día ${proximo.previstos[0].dia.numero}`}
                </p>
              )}
            </div>
          ) : previstos.map(({ dia }) => {
            const estado = estadoEntreno(sesiones, hoy, dia.numero)
            const n = delDia(dia.numero).length
            return <TarjetaEntreno key={dia.numero} to={`/mi-rutina/dia/${dia.numero}`} numero={dia.numero} titulo={dia.titulo || `Día ${dia.numero}`} subtitulo={`${n} ejercicio${n === 1 ? '' : 's'} · ${ESTADO[estado]}`} estado={estado} />
          })}
        </div>
      </section>

      {rutina && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[28px] font-light tracking-tight">Tu semana</h2>
            <span className="text-[14px] font-light text-slate-500">{hechosSemana} de {previstosSemana} entrenos</span>
          </div>
          <div className="-mx-4 mt-4">
            <SemanaCapsulas rutina={rutina} sesiones={sesiones} ancla={hoy} seleccionada={hoy} onElegir={d => navigate(`/agenda?f=${claveFecha(d)}`)} />
          </div>
        </section>
      )}
    </div>
  )
}
