import { MATERIALES, SIN_CLASIFICAR } from '../lib/material'

// Desplegable para filtrar ejercicios por material, con cuántos ejercicios tiene cada opción.
// Solo ofrece los materiales que hay en la lista. valor: id del material, SIN_CLASIFICAR o null (todos).
export default function FiltroMaterial({ ejercicios, valor, onChange, className = '' }) {
  const cuenta = id => ejercicios.filter(e => (id === SIN_CLASIFICAR ? !(e.material?.length) : e.material?.includes(id))).length
  const opciones = [
    ...MATERIALES.map(m => ({ id: m.id, nombre: m.nombre, n: cuenta(m.id) })),
    { id: SIN_CLASIFICAR, nombre: 'Sin clasificar', n: cuenta(SIN_CLASIFICAR) },
  ].filter(o => o.n > 0 || o.id === valor)

  return (
    <label className={`relative block shrink-0 ${className}`}>
      <span className="sr-only">Filtrar por material</span>
      <select className={`input !pr-8 ${valor ? '!border-teal-600 !bg-teal-50 font-medium text-teal-900' : ''}`}
        value={valor ?? ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">Material: todos</option>
        {opciones.map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.n})</option>)}
      </select>
    </label>
  )
}
