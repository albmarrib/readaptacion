// Estado de pago de un centro. Debe coincidir con alDia() de firestore.rules y pagoAlDia() de
// functions/index.js: al acabar la prueba o fallar el pago hay 7 días de plazo; después se bloquea
// al administrador y a los entrenadores (los pacientes siguen entrando). Centros sin plan: nunca.
export const DIAS_PLAZO = 7
const ms = t => t?.toMillis?.() ?? (typeof t === 'number' ? t : null)

// fase: 'ok' | 'plazo' (aviso en rojo) | 'bloqueado'; limite: fecha (ms) en que se bloquea
export function estadoPago(c, ahora = Date.now()) {
  if (!c?.plan || c.plan === 'pago') return { fase: 'ok' }
  const base = c.plan === 'prueba' ? ms(c.pruebaHasta) : ms(c.suscripcion?.finPeriodo ?? c.pagoHasta)
  if (base == null) return { fase: c.plan === 'prueba' ? 'ok' : 'bloqueado' }
  if (ahora < base) return { fase: 'ok' }
  const limite = base + DIAS_PLAZO * 864e5
  return { fase: ahora < limite ? 'plazo' : 'bloqueado', limite }
}

export const fechaCorta = t => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
