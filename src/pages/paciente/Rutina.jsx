import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePlanPaciente } from '../../lib/planPaciente'
import { useGrupos } from '../../lib/datos'
import { DIAS_SEMANA, diaSemanaDe } from '../../lib/plan'
import { PuertaPaciente, useCatalogo } from '../MiRutina'
import Foto from '../../components/Foto'
import { Bloque, agruparEnBloques, resumenVolumen } from '../../components/paciente/Bloques'
import VisorEjercicio from '../../components/paciente/VisorEjercicio'
import { IAtras, IChevronDer, IFlecha } from '../../components/paciente/IconosPaciente'

const fmt = t => (t?.toDate ? t.toDate() : t ? new Date(t) : null)?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

// Texto que se recorta con "Ver más"
function TextoPlegable({ texto }) {
  const [abierto, setAbierto] = useState(false)
  if (!texto) return null
  return (
    <div className="mt-5 text-[17px] font-light leading-snug text-slate-600">
      <p className={abierto ? '' : 'line-clamp-2'}>{texto}</p>
      {texto.length > 90 && <div className="mt-1 text-right"><button onClick={() => setAbierto(a => !a)} className="text-[16px] text-tinta underline underline-offset-4">{abierto ? 'Ver menos' : 'Ver más'}</button></div>}
    </div>
  )
}

// ---------- Mi rutina: los días de la rutina activa ----------
export default function Rutina() {
  return <PuertaPaciente>{pid => <PantallaRutina pid={pid} />}</PuertaPaciente>
}

function PantallaRutina({ pid }) {
  const { rutinas, rutina, delDia } = usePlanPaciente(pid)
  if (!rutinas) return <p className="px-5 pt-6 font-light text-slate-500">Cargando…</p>
  return (
    <div className="px-5 pt-3">
      <h1 className="titulo-grande">Tu rutina</h1>
      {!rutina ? (
        <p className="mt-6 text-[17px] font-light text-slate-500">{rutinas.length ? 'Tu rutina ha terminado. Tu entrenador está preparando la siguiente.' : 'Aún no tienes ninguna rutina.'}</p>
      ) : (
        <>
          <p className="mt-2 text-[16px] font-light tracking-wide text-slate-500">Rutina {rutina.numero}{rutina.fechaInicio && ` · del ${fmt(rutina.fechaInicio)} al ${fmt(rutina.fechaFin)}`}</p>
          <TextoPlegable texto={rutina.notaGeneral} />
          <ul className="-mx-5 mt-8 border-t border-tinta/70">
            {rutina.dias.map((dia, i) => {
              const n = delDia(dia.numero).length
              const ds = diaSemanaDe(rutina, i)
              return (
                <li key={dia.numero} className="border-b border-tinta/70">
                  <Link to={`/mi-rutina/dia/${dia.numero}`} className="flex items-center gap-4 px-5 py-6 active:bg-white/60">
                    <span className="text-[34px] font-extralight tabular-nums text-slate-400">{String(dia.numero).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[19px] uppercase tracking-wide">{dia.titulo || `Día ${dia.numero}`}</span>
                      <span className="mt-1 block text-[15px] font-light text-slate-500">{n} ejercicio{n === 1 ? '' : 's'}{ds ? ` · ${DIAS_SEMANA[ds - 1]}` : ''}</span>
                    </span>
                    <IChevronDer width={26} height={26} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {rutinas.some(r => r.estado !== 'activa') && (
        <Link to="/mi-rutina/historial" className="mt-8 inline-block text-[15px] font-light text-tinta underline underline-offset-4">Ver rutinas anteriores</Link>
      )}
    </div>
  )
}

// ---------- Un día de la rutina: bloques con sus ejercicios ----------
export function DiaRutina() {
  return <PuertaPaciente>{pid => <PantallaDia pid={pid} />}</PuertaPaciente>
}

function PantallaDia({ pid }) {
  const { n } = useParams()
  const navigate = useNavigate()
  const { rutinas, rutina, delDia } = usePlanPaciente(pid)
  const grupos = useGrupos()
  const [visor, setVisor] = useState(null)
  if (!rutinas) return <p className="px-5 pt-6 font-light text-slate-500">Cargando…</p>
  const dia = rutina?.dias.find(d => d.numero === Number(n))
  if (!dia) return <p className="px-5 pt-6 font-light text-slate-500">No se encuentra este día.</p>
  const ejercicios = delDia(dia.numero)
  const bloques = agruparEnBloques(ejercicios, grupos)

  return (
    <div className="pt-1">
      <div className="px-5">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="-ml-1 p-1 text-tinta active:scale-90"><IAtras width={30} height={30} /></button>
        <h1 className="titulo-grande mt-4 uppercase !text-[2.4rem]">{dia.titulo || `Día ${dia.numero}`}</h1>
        <TextoPlegable texto={rutina.notaGeneral} />
      </div>

      <div className="mt-8">
        {bloques.map(b => (
          <Bloque key={b.grupoId} titulo={b.titulo}>
            <ul className="divide-y divide-slate-300/70 border-y border-slate-300/70 bg-white">
              {b.ejercicios.map(e => <FilaEjercicio key={e.id} ejercicio={e} onAbrir={() => setVisor(e)} />)}
            </ul>
          </Bloque>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[4.9rem] z-20 px-5 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-xl"><button className="boton-pildora" onClick={() => navigate(`/entreno/${dia.numero}`)} disabled={!ejercicios.length}>Iniciar entrenamiento</button></div>
      </div>
      <div className="h-24" />
      {visor && <VisorEjercicio ejercicio={visor} onCerrar={() => setVisor(null)} />}
    </div>
  )
}

function FilaEjercicio({ ejercicio: e, onAbrir }) {
  const cat = useCatalogo(e.ejercicioId)
  const [titulo] = e.nombre.split('\n').filter(Boolean)
  return (
    <li>
      <button onClick={onAbrir} className="flex w-full items-stretch text-left active:bg-slate-50">
        <span className="h-[8.5rem] w-[38%] max-w-44 shrink-0 bg-slate-100">
          {cat?.fotos?.[0] && <Foto ruta={cat.fotos[0]} className="h-full w-full !bg-white" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-between px-5 py-4">
          <span className="flex items-start justify-between gap-3">
            <span className="text-[19px] font-light leading-snug">{titulo}</span>
            <IFlecha width={26} height={26} className="mt-6 shrink-0" />
          </span>
          <span className="truncate text-[15px] font-medium tracking-wide">{resumenVolumen(e)}</span>
        </span>
      </button>
    </li>
  )
}
