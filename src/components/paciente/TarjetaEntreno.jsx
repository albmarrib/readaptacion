import { Link } from 'react-router-dom'
import { ICheck, IChevronDer } from './IconosPaciente'

// Tarjeta de un entreno (un día de la rutina) con su estado: pendiente, en curso o completado
export default function TarjetaEntreno({ to, titulo, subtitulo, estado = 'pendiente', numero }) {
  const hecho = estado === 'completado'
  const curso = estado === 'en curso'
  return (
    <Link to={to} className="flex items-center gap-4 active:opacity-80">
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${hecho ? 'bg-emerald-500 text-white' : curso ? 'border-2 border-amber-400 text-amber-500' : 'border border-tinta/60 text-tinta'}`}>
        {hecho ? <ICheck width={28} height={28} strokeWidth={2} /> : <span className="text-lg font-medium">{numero}</span>}
      </span>
      <span className={`flex min-w-0 flex-1 items-center gap-3 border bg-white px-5 py-5 ${hecho ? 'border-emerald-500' : curso ? 'border-amber-400' : 'border-tinta/60'}`}>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[19px] font-normal uppercase tracking-wide ${hecho ? 'text-emerald-600' : 'text-tinta'}`}>{titulo}</span>
          <span className={`mt-1.5 block text-[15px] font-light tracking-wide ${hecho ? 'text-emerald-600' : curso ? 'text-amber-600' : 'text-slate-500'}`}>{subtitulo}</span>
        </span>
        <IChevronDer width={26} height={26} className="shrink-0 text-tinta" />
      </span>
    </Link>
  )
}
