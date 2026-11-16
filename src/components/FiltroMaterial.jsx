import { MATERIALES, SIN_CLASIFICAR } from '../lib/material'

// Botones para filtrar ejercicios por material. Solo muestra los materiales que hay en la lista,
// con cuántos ejercicios tiene cada uno. valor: id del material, SIN_CLASIFICAR o null (todos).
export default function FiltroMaterial({ ejercicios, valor, onChange }) {
  const cuenta = id => ejercicios.filter(e => (id === SIN_CLASIFICAR ? !(e.material?.length) : e.material?.includes(id))).length
  const opciones = [
    ...MATERIALES.map(m => ({ id: m.id, nombre: m.nombre, n: cuenta(m.id) })),
    { id: SIN_CLASIFICAR, nombre: 'Sin clasificar', n: cuenta(SIN_CLASIFICAR) },
  ].filter(o => o.n > 0 || o.id === valor)
  if (opciones.length < 2 && !valor) return null

  const boton = (id, nombre, n) => (
    <button type="button" key={id ?? 'todos'} onClick={() => onChange(id)}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition ${valor === id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400'}`}>
      {nombre}{n != null && <span className={valor === id ? 'text-teal-100' : 'text-slate-400'}> {n}</span>}
    </button>
  )
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por material">
      <span className="mr-1 text-xs font-medium text-slate-500">Material:</span>
      {boton(null, 'Todos')}
      {opciones.map(o => boton(o.id, o.nombre, o.n))}
    </div>
  )
}
