import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { estadoPago, fechaCorta } from '../lib/pago'
import { Logo } from './Iconos'
import Suscripcion from '../pages/Suscripcion'

// Aviso en rojo para el administrador durante la semana de plazo para pagar
export function AvisoPlazoPago() {
  const { pago, esAdmin, perfil } = useAuth()
  if (!esAdmin || pago.fase !== 'plazo') return null
  return (
    <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <b>Tu periodo de prueba o tu último pago ha terminado.</b> Tienes hasta el <b>{fechaCorta(pago.limite)}</b> para activar la suscripción.
      Después, tú y tus entrenadores no podréis entrar (tus pacientes sí, y no se pierde ningún dato).
      {' '}{perfil && <Link to="/suscripcion" className="font-semibold underline">Activar ahora</Link>}
    </div>
  )
}

// Pantalla para el personal de un centro bloqueado por no pagar a tiempo
export function PantallaBloqueoPago() {
  const { esAdmin, salir } = useAuth()
  return (
    <div className="min-h-dvh bg-fondo p-4">
      <div className="mx-auto max-w-xl space-y-4 pt-6">
        <div className="flex items-center gap-2"><Logo tamano={32} /><span className="font-bold">Entrenamiento Personal</span>
          <button onClick={salir} className="ml-auto text-sm text-slate-500 hover:text-teal-700">Cerrar sesión</button>
        </div>
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <b>El acceso del centro está bloqueado</b> porque terminó el plazo para pagar la suscripción.
          {esAdmin ? ' Actívala para volver a entrar al momento: no se ha perdido ningún dato y tus pacientes siguen pudiendo usar la app.' : ' Habla con el administrador de tu centro. No se ha perdido ningún dato.'}
        </p>
        {esAdmin && <Suscripcion />}
      </div>
    </div>
  )
}

// Superadministrador: centros en semana de plazo o ya bloqueados por no pagar
export function useCentrosConPagoPendiente(activo) {
  const [lista, setLista] = useState([])
  useEffect(() => {
    if (!activo) { setLista([]); return }
    return onSnapshot(collection(db, 'centros'), s => setLista(
      s.docs.map(d => ({ id: d.id, nombre: d.data().nombre, ...estadoPago(d.data()) })).filter(c => c.fase !== 'ok')
    ), () => setLista([]))
  }, [activo])
  return lista
}

export function AvisoSuperPagos({ lista }) {
  if (!lista.length) return null
  return (
    <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <b>Centros sin pagar:</b>{' '}
      {lista.map((c, i) => <span key={c.id}>{i > 0 && ' · '}{c.nombre} ({c.fase === 'plazo' ? `se bloquea el ${fechaCorta(c.limite)}` : 'bloqueado'})</span>)}
      {' '}<Link to="/centros" className="font-semibold underline">Ver centros</Link>
    </div>
  )
}
