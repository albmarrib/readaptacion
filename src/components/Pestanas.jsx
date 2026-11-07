// Pestañas con subrayado. items: [{ id, etiqueta, n? }]
export default function Pestanas({ items, activo, onChange }) {
  return (
    <div role="tablist" className="flex overflow-x-auto border-b border-slate-200 [scrollbar-width:thin]">
      {items.map(i => {
        const on = i.id === activo
        return (
          <button key={i.id} role="tab" aria-selected={on} onClick={() => onChange(i.id)}
            className={`relative -mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2 text-[13px] font-medium transition ${on ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}>
            {i.etiqueta}
            {i.n != null && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${on ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>{i.n}</span>}
          </button>
        )
      })}
    </div>
  )
}
