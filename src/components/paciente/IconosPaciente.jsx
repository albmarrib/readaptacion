// Iconos de línea fina para la app del paciente
const base = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const ICasa = p => <svg {...base} {...p}><path d="M4 10.5 12 4l8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></svg>
export const IAgenda = p => <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><text x="12" y="17.6" textAnchor="middle" fontSize="6.5" fontFamily="Outfit, sans-serif" fill="currentColor" stroke="none">31</text></svg>
export const IPesa = p => <svg {...base} {...p}><path d="M3 12h2m14 0h2M5 8v8m14-8v8M7.5 9.5v5m9-5v5M7.5 12h9" /></svg>
export const IEvolucion = p => <svg {...base} {...p}><path d="M3.5 19.5h17" /><path d="m4.5 15.5 5-5 3.5 3.5 6.5-7" /><path d="M15 7h4.5v4.5" /></svg>
export const IPerfil = p => <svg {...base} {...p}><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="10" r="3.3" /><path d="M6.2 18.3a6.6 6.6 0 0 1 11.6 0" /></svg>
export const IChat = p => <svg {...base} {...p}><path d="M14.5 15.5a6 6 0 1 0-3-.8L9 17l.6-3.2" /><path d="M16.8 9.6A5 5 0 0 1 20 14.4a5 5 0 0 1-.7 2.6l.6 2.8-2.7-1.6a5 5 0 0 1-6.7-1.3" /></svg>
export const IFlecha = p => <svg {...base} {...p}><path d="M7 17 17 7M9 7h8v8" /></svg>
export const IAtras = p => <svg {...base} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
export const IChevronIzq = p => <svg {...base} {...p}><path d="m15 5-7 7 7 7" /></svg>
export const IChevronDer = p => <svg {...base} {...p}><path d="m9 5 7 7-7 7" /></svg>
export const IMas = p => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
export const IMenos = p => <svg {...base} {...p}><path d="M5 12h14" /></svg>
export const ICheck = p => <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
export const ICrono = p => <svg {...base} {...p}><circle cx="12" cy="13.5" r="7.5" /><path d="M12 13.5V9.5M10 3h4M18.5 6.5l1.2-1.2" /></svg>
export const IBandera = p => <svg {...base} {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
export const IInfo = p => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>
export const IPlay = p => <svg {...base} {...p}><path d="M8 5.5v13l11-6.5z" /></svg>
export const ILista = p => <svg {...base} {...p}><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.5" cy="6.5" r=".8" fill="currentColor" /><circle cx="4.5" cy="12" r=".8" fill="currentColor" /><circle cx="4.5" cy="17.5" r=".8" fill="currentColor" /></svg>
