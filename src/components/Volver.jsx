import { Link } from 'react-router-dom'
import { IconoChevronIzq } from './Iconos'

// Botón de volver con el nombre de la pantalla a la que se regresa
export default function Volver({ to, texto, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="group inline-flex h-8 items-center gap-1 rounded-full border border-slate-300/90 bg-white py-0 pl-1.5 pr-3 text-xs font-medium text-slate-600 shadow-sm transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800">
      <IconoChevronIzq width={16} height={16} className="transition group-hover:-translate-x-0.5" />
      {texto}
    </Link>
  )
}
