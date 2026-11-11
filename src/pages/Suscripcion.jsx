import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { funciones } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { useCentro } from '../lib/centro'
import { EncabezadoPagina, IconoTarjeta } from '../components/Iconos'

// Suscripción del centro (solo el administrador). Pagos con Stripe en MODO DE PRUEBA: no se cobra
// dinero real. El precio es provisional.
const llamar = (n, d) => httpsCallable(funciones, n)(d).then(r => r.data)
const fecha = t => (t ? (t.toDate?.() ?? new Date(t)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')
const ESTADO = {
  prueba: ['Periodo de prueba', 'bg-sky-100 text-sky-800'],
  pago: ['Suscripción activa', 'bg-emerald-100 text-emerald-800'],
  impago: ['Pago pendiente', 'bg-amber-100 text-amber-800'],
  cancelado: ['Suscripción cancelada', 'bg-rose-100 text-rose-800'],
}

export default function Suscripcion() {
  const { perfil } = useAuth()
  const centro = useCentro(perfil.centroId)
  const [params, setParams] = useSearchParams()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const sincronizado = useRef(false)

  // Al volver del pago (o al abrir la página) se comprueba el estado real en Stripe
  useEffect(() => {
    if (!centro || sincronizado.current) return
    sincronizado.current = true
    if (!centro.stripeClienteId && !params.get('pago')) return
    llamar('sincronizarSuscripcion')
      .then(() => { if (params.get('pago')) { setAviso('¡Gracias! Tu suscripción está activa.'); setParams({}, { replace: true }) } })
      .catch(e => setError(e.message))
  }, [centro, params, setParams])

  const ir = nombre => async () => {
    setOcupado(true); setError('')
    try { window.location.href = (await llamar(nombre, { origen: window.location.origin })).url }
    catch (e) { setError(e.message); setOcupado(false) }
  }

  if (!centro) return <p className="text-slate-500">Cargando…</p>
  const plan = centro.plan ?? (centro.pruebaHasta ? 'prueba' : null)
  const [etiqueta, color] = ESTADO[plan] ?? ['Centro fundador', 'bg-teal-100 text-teal-800']
  const pruebaTerminada = plan === 'prueba' && centro.pruebaHasta?.toMillis() < Date.now()
  const s = centro.suscripcion

  return (
    <div className="max-w-xl space-y-4">
      <EncabezadoPagina icono={IconoTarjeta} color="violet" titulo="Suscripción" subtitulo={centro.nombre} />
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>Modo de prueba.</b> Los pagos aún no son reales: no se cobra nada. Para probar usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier código.</p>
      {aviso && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="tarjeta space-y-3">
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{etiqueta}</span>
        {plan === 'prueba' && <p className="text-sm">{pruebaTerminada ? 'Tu periodo de prueba terminó el' : 'Tu prueba gratuita dura hasta el'} <b>{fecha(centro.pruebaHasta)}</b>.</p>}
        {plan === 'pago' && s && <p className="text-sm">{s.cancelaAlFinal ? 'Cancelada: seguirás teniendo acceso hasta el' : s.enPrueba ? 'Suscripción activada. El primer cobro será al terminar la prueba, el' : 'Próxima renovación:'} <b>{fecha(s.finPeriodo)}</b>.</p>}
        {plan === 'impago' && <p className="text-sm">No se ha podido cobrar la última cuota. Actualiza tu forma de pago para no perder el acceso.</p>}
        {plan === 'cancelado' && <p className="text-sm">Tu suscripción está cancelada. Puedes volver a activarla cuando quieras.</p>}
        {!plan && <p className="text-sm">Tu centro no necesita suscripción.</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          {['prueba', 'cancelado'].includes(plan) && (
            <button className="btn" disabled={ocupado} onClick={ir('crearPagoSuscripcion')}>{ocupado ? 'Abriendo…' : 'Activar suscripción · 29 €/mes + IVA'}</button>
          )}
          {['pago', 'impago'].includes(plan) && centro.stripeClienteId && (
            <button className="btn-sec" disabled={ocupado} onClick={ir('portalSuscripcion')}>{ocupado ? 'Abriendo…' : 'Gestionar pago, facturas o cancelar'}</button>
          )}
        </div>
      </section>
      <p className="text-xs text-slate-500">El pago lo gestiona Stripe; la app no guarda los datos de tu tarjeta. Precio provisional.</p>
    </div>
  )
}
