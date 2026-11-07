// Iconos de línea sencillos (sin dependencias)
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const IconoPacientes = p => <svg {...base} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
export const IconoCatalogo = p => <svg {...base} {...p}><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" /></svg>
export const IconoVolumenes = p => <svg {...base} {...p}><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></svg>
export const IconoAvisos = p => <svg {...base} {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
export const IconoEntrenadores = p => <svg {...base} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
export const IconoRutina = p => <svg {...base} {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></svg>
export const IconoEvolucion = p => <svg {...base} {...p}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg>
export const IconoChevronIzq = p => <svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>

// Marca de la app: cuadrado con una mancuerna. variante "claro" para fondos oscuros.
export function Logo({ tamano = 32, claro = false }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#14b8a6" /><stop offset="1" stopColor="#0f766e" /></linearGradient></defs>
      <rect width="64" height="64" rx="15" fill={claro ? '#ffffff' : 'url(#lg)'} />
      <path d="M14 32h6m24 0h6M20 24v16m24-16v16M24 28v8m16-8v8M24 32h16" stroke={claro ? '#0f766e' : '#fff'} strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// Cabecera de página: icono de color + título (+ contenido a la derecha)
const COLORES = {
  teal: 'bg-teal-100 text-teal-700', sky: 'bg-sky-100 text-sky-700', indigo: 'bg-indigo-100 text-indigo-700',
  amber: 'bg-amber-100 text-amber-700', rose: 'bg-rose-100 text-rose-700', violet: 'bg-violet-100 text-violet-700',
}
export function EncabezadoPagina({ icono: Icono, color = 'teal', titulo, subtitulo, children }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${COLORES[color]}`}><Icono width={20} height={20} /></span>
      <div className="min-w-0">
        <h1 className="titulo-pagina leading-tight">{titulo}</h1>
        {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

// Iniciales de color para identificar a una persona de un vistazo
const PALETA = ['bg-teal-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-600']
export function Avatar({ nombre = '', tamano = 32 }) {
  const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
  const color = PALETA[[...nombre].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETA.length]
  return <span style={{ width: tamano, height: tamano, fontSize: tamano * 0.38 }} className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color}`}>{iniciales}</span>
}
