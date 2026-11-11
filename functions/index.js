const { onCall, HttpsError } = require('firebase-functions/v2/https')
const crypto = require('node:crypto')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getMessaging } = require('firebase-admin/messaging')
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')

initializeApp()
const REGION = 'europe-west1'

// Contraseña temporal legible (sin letras ni números que se confundan)
const claveTemporal = () => {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.randomBytes(10), b => a[b % a.length]).join('')
}

// Aviso push a todos los dispositivos de un usuario. Nunca incluye el contenido del mensaje
// (la pantalla bloqueada puede verla cualquiera). Si un dispositivo ya no existe, se borra.
async function enviarPush(uid, { titulo, cuerpo, url }) {
  if (!uid) return
  try {
    const snap = await getFirestore().collection(`usuarios/${uid}/dispositivos`).get()
    if (snap.empty) return
    const r = await getMessaging().sendEachForMulticast({
      tokens: snap.docs.map(d => d.data().token),
      data: { titulo, cuerpo, url },
      webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    })
    const caducados = []
    r.responses.forEach((x, i) => {
      if (!x.success && /not-registered|invalid-registration-token|invalid-argument/.test(x.error?.code ?? '')) caducados.push(snap.docs[i].ref.delete())
    })
    await Promise.all(caducados)
  } catch (e) { console.error('push', uid, e.message) }
}

// Devuelve el perfil del usuario que llama si está activo y es administrador o entrenador.
async function personalActivo(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.')
  const yo = await getFirestore().doc(`usuarios/${req.auth.uid}`).get()
  const d = yo.data()
  if (!yo.exists || d.activo !== true || !['admin', 'entrenador'].includes(d.rol)) {
    throw new HttpsError('permission-denied', 'No tienes permiso para hacer esto.')
  }
  const centro = d.centroId ? await getFirestore().doc(`centros/${d.centroId}`).get() : null
  if (centro?.data()?.estado === 'suspendido') throw new HttpsError('permission-denied', 'Tu centro está suspendido.')
  return d
}

// Cuenta de acceso para un correo: la reutiliza si existe, o la crea ya verificada.
// El acceso real se decide por usuarios/{uid}; sin perfil la cuenta no entra a nada.
async function cuentaPorCorreo(email, nombre) {
  try {
    return await getAuth().getUserByEmail(email)
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e
    return getAuth().createUser({ email, emailVerified: true, displayName: nombre })
  }
}

// Carga la ficha y comprueba que quien llama es administrador o el entrenador del paciente.
async function fichaAutorizada(req) {
  const yo = await personalActivo(req)
  const pacienteId = String(req.data?.pacienteId ?? '')
  if (!pacienteId) throw new HttpsError('invalid-argument', 'Falta el paciente.')
  const ref = getFirestore().doc(`pacientes/${pacienteId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'No se encuentra el paciente.')
  // El administrador solo puede con los de su centro; el entrenador, solo con los suyos
  const permitido = yo.rol === 'admin' ? snap.data().centroId === yo.centroId : snap.data().entrenadorId === req.auth.uid
  if (!yo.centroId || !permitido) {
    throw new HttpsError('permission-denied', 'Este paciente no es tuyo.')
  }
  return { ref, pacienteId, ficha: snap.data() }
}

// Superadministrador (dueño de la app). Solo ve recuentos por centro, nunca datos de pacientes.
async function superActivo(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.')
  const d = (await getFirestore().doc(`usuarios/${req.auth.uid}`).get()).data()
  if (!d || d.activo !== true || d.superadmin !== true) throw new HttpsError('permission-denied', 'Solo para el superadministrador.')
  return d
}

// Lista de centros con recuentos (entrenadores, pacientes, ejercicios)
exports.resumenCentros = onCall({ region: REGION }, async (req) => {
  await superActivo(req)
  const db = getFirestore()
  const centros = await db.collection('centros').get()
  const cuenta = async q => (await q.count().get()).data().count
  return Promise.all(centros.docs.map(async c => {
    const d = c.data()
    const [entrenadores, pacientes, pacientesActivos, ejercicios] = await Promise.all([
      cuenta(db.collection('usuarios').where('centroId', '==', c.id).where('rol', 'in', ['admin', 'entrenador'])),
      cuenta(db.collection('pacientes').where('centroId', '==', c.id)),
      cuenta(db.collection('pacientes').where('centroId', '==', c.id).where('estado', '==', 'activo')),
      cuenta(db.collection('ejercicios').where('centroId', '==', c.id)),
    ])
    return { id: c.id, nombre: d.nombre, logo: d.logo ?? null, estado: d.estado ?? 'activo', creado: d.creado?.toMillis?.() ?? null, plan: d.plan ?? null, pruebaHasta: d.pruebaHasta?.toMillis?.() ?? null, pagoHasta: d.suscripcion?.finPeriodo?.toMillis?.() ?? null, entrenadores, pacientes, pacientesActivos, ejercicios }
  }))
})

// Suspender o reactivar un centro. No se puede suspender el propio (para no quedarse fuera).
exports.cambiarEstadoCentro = onCall({ region: REGION }, async (req) => {
  const yo = await superActivo(req)
  const centroId = String(req.data?.centroId ?? '')
  const estado = req.data?.estado
  if (!['activo', 'suspendido'].includes(estado)) throw new HttpsError('invalid-argument', 'Estado no válido.')
  if (estado === 'suspendido' && centroId === yo.centroId) throw new HttpsError('failed-precondition', 'No puedes suspender tu propio centro.')
  const ref = getFirestore().doc(`centros/${centroId}`)
  if (!(await ref.get()).exists) throw new HttpsError('not-found', 'No existe ese centro.')
  await ref.update({ estado, estadoCambiado: FieldValue.serverTimestamp() })
  return { ok: true }
})

// Registro de un centro nuevo por su cuenta. Quien llama debe haber iniciado sesión con un correo
// verificado (Google o enlace al correo) y no tener todavía perfil en la app. Se crea el centro
// (vacío, con 30 días de prueba) y su perfil de administrador, guardando la aceptación de las
// condiciones y del contrato de encargo (fecha del servidor + versión).
// VERSION_LEGAL debe coincidir con src/legal/titular.js.
const VERSION_LEGAL = '2026-11-borrador'
const DIAS_PRUEBA = 30
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

exports.registrarCentro = onCall({ region: REGION }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.')
  const email = String(req.auth.token.email ?? '').toLowerCase()
  if (!email || req.auth.token.email_verified !== true) throw new HttpsError('failed-precondition', 'Entra con Google o con el enlace al correo para verificar tu correo.')
  const nombreCentro = String(req.data?.nombreCentro ?? '').trim().replace(/\s+/g, ' ')
  const nombre = String(req.data?.nombre ?? '').trim().replace(/\s+/g, ' ')
  if (nombreCentro.length < 2 || nombreCentro.length > 80) throw new HttpsError('invalid-argument', 'Escribe el nombre del centro (de 2 a 80 caracteres).')
  if (nombre.length < 2 || nombre.length > 80) throw new HttpsError('invalid-argument', 'Escribe tu nombre.')
  if (req.data?.acepta !== true || req.data?.version !== VERSION_LEGAL) throw new HttpsError('failed-precondition', 'Tienes que aceptar las condiciones y el contrato de encargo vigentes.')

  const db = getFirestore()
  const uRef = db.doc(`usuarios/${req.auth.uid}`)
  const base = slug(nombreCentro) || 'centro'
  return db.runTransaction(async t => {
    if ((await t.get(uRef)).exists) throw new HttpsError('already-exists', 'Esta cuenta ya pertenece a un centro.')
    // Id legible y único: nombre del centro, con un sufijo si ya existe
    let id = base
    for (let i = 0; (await t.get(db.doc(`centros/${id}`))).exists; i++) {
      if (i > 4) throw new HttpsError('aborted', 'Inténtalo de nuevo.')
      id = `${base}-${crypto.randomBytes(2).toString('hex')}`
    }
    const ahora = Timestamp.now()
    t.create(db.doc(`centros/${id}`), {
      nombre: nombreCentro, estado: 'activo', creado: FieldValue.serverTimestamp(),
      plan: 'prueba', pruebaHasta: Timestamp.fromMillis(ahora.toMillis() + DIAS_PRUEBA * 864e5),
      titularUid: req.auth.uid,
      aceptacion: { version: VERSION_LEGAL, fecha: FieldValue.serverTimestamp(), uid: req.auth.uid, email, nombre },
    })
    t.create(uRef, { rol: 'admin', nombre, email, activo: true, centroId: id, puedeEditarCatalogo: true })
    return { centroId: id }
  })
})

// Alta de entrenadores: solo la puede hacer un administrador activo.
exports.crearEntrenador = onCall({ region: REGION }, async (req) => {
  const yo = await personalActivo(req)
  if (yo.rol !== 'admin') throw new HttpsError('permission-denied', 'Solo el administrador puede dar de alta entrenadores.')

  const email = String(req.data?.email ?? '').trim().toLowerCase()
  const nombre = String(req.data?.nombre ?? '').trim()
  const puedeEditarCatalogo = req.data?.puedeEditarCatalogo === true
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'El correo no es válido.')
  if (nombre.length < 2 || nombre.length > 120) throw new HttpsError('invalid-argument', 'Escribe el nombre del entrenador.')

  const user = await cuentaPorCorreo(email, nombre)
  const ref = getFirestore().doc(`usuarios/${user.uid}`)
  if ((await ref.get()).exists) throw new HttpsError('already-exists', 'Ya existe un usuario con ese correo.')
  if (!yo.centroId) throw new HttpsError('failed-precondition', 'Tu usuario no tiene centro asignado.')
  await ref.set({ rol: 'entrenador', nombre, email, activo: true, puedeEditarCatalogo, centroId: yo.centroId })
  return { uid: user.uid }
})

// Da acceso a la app a un paciente: crea su perfil de rol "paciente" enlazado a su ficha.
// Requiere el correo en la ficha. El paciente entra después con Google o con un enlace que le
// llega a ese correo, y acepta el consentimiento él mismo en su primera entrada.
exports.invitarPaciente = onCall({ region: REGION }, async (req) => {
  const { ref, pacienteId, ficha } = await fichaAutorizada(req)
  const email = String(ficha.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('failed-precondition', 'La ficha no tiene un correo válido. Añádelo y guarda.')

  const user = await cuentaPorCorreo(email, ficha.nombre)
  const uRef = getFirestore().doc(`usuarios/${user.uid}`)
  const existente = await uRef.get()
  if (existente.exists && !(existente.data().rol === 'paciente' && existente.data().pacienteId === pacienteId)) {
    throw new HttpsError('already-exists', 'Ese correo ya pertenece a otro usuario de la app.')
  }
  // La cuenta se crea con una clave aleatoria que nadie conoce: el paciente elige la suya con el correo
  // de invitación (que envía la app) y a partir de ahí entra con su correo y su contraseña.
  const clave = claveTemporal()
  await getAuth().updateUser(user.uid, { password: clave })
  const lote = getFirestore().batch()
  lote.set(uRef, { rol: 'paciente', nombre: ficha.nombre, email, activo: true, pacienteId, centroId: ficha.centroId })
  lote.update(ref, { uid: user.uid, estado: 'activo' })
  await lote.commit()
  return { uid: user.uid }
})

// Borra por completo a un paciente (derecho de supresión): ficha, rutinas, notas, avisos,
// su perfil de acceso y su cuenta.
exports.eliminarPaciente = onCall({ region: REGION }, async (req) => {
  const { ref, pacienteId, ficha } = await fichaAutorizada(req)
  const db = getFirestore()

  // Solo se borra la cuenta si de verdad es la de este paciente (no se fía del campo uid de la ficha)
  if (ficha.uid) {
    const uRef = db.doc(`usuarios/${ficha.uid}`)
    const u = await uRef.get()
    if (u.exists && u.data().rol === 'paciente' && u.data().pacienteId === pacienteId) {
      await uRef.delete()
      try { await getAuth().deleteUser(ficha.uid) } catch (e) { if (e.code !== 'auth/user-not-found') throw e }
    }
  }
  const avisos = await db.collection('avisos').where('pacienteId', '==', pacienteId).get()
  await Promise.all(avisos.docs.map(d => d.ref.delete()))
  await db.doc(`chats/${pacienteId}`).delete()
  await db.recursiveDelete(ref)
  return { ok: true }
})

// Cada día: las rutinas activas cuya fecha de fin ya pasó pasan a "pendiente" (requieren revisión)
// y se crea un aviso para el entrenador del paciente. Se puede repetir sin duplicar avisos.
exports.revisarRutinas = onSchedule({ region: REGION, schedule: 'every day 07:00', timeZone: 'Europe/Madrid' }, async () => {
  const db = getFirestore()
  const vencidas = await db.collectionGroup('rutinas').where('fechaFin', '<=', Timestamp.now()).get()
  let n = 0
  for (const r of vencidas.docs) {
    if (r.data().estado !== 'activa') continue
    const pacienteRef = r.ref.parent.parent
    const paciente = await pacienteRef.get()
    if (!paciente.exists) continue
    const lote = db.batch()
    lote.update(r.ref, { estado: 'pendiente' })
    lote.set(db.doc(`avisos/${r.id}`), {
      entrenadorId: paciente.data().entrenadorId, pacienteId: pacienteRef.id, rutinaId: r.id, centroId: paciente.data().centroId,
      tipo: 'rutina_vencida', fecha: FieldValue.serverTimestamp(), leido: false,
    })
    await lote.commit()
    await enviarPush(paciente.data().entrenadorId, { titulo: 'Rutina terminada', cuerpo: `La rutina de ${paciente.data().nombre} ha terminado y requiere revisión`, url: '/avisos' })
    n++
  }
  console.log(`Rutinas vencidas procesadas: ${n}`)
})

// Chat: al llegar un mensaje se actualiza el resumen de la conversación (último mensaje y no leídos
// del otro lado). Lo hace el servidor para que ningún cliente pueda falsear los contadores.
exports.nuevoMensaje = onDocumentCreated({ document: 'pacientes/{pid}/mensajes/{mid}', region: REGION }, async (event) => {
  const m = event.data?.data()
  if (!m) return
  const db = getFirestore()
  const pid = event.params.pid
  const paciente = await db.doc(`pacientes/${pid}`).get()
  if (!paciente.exists) return
  const delPaciente = m.autorRol === 'paciente'
  await db.doc(`chats/${pid}`).set({
    entrenadorId: paciente.data().entrenadorId,
    pacienteId: pid,
    centroId: paciente.data().centroId,
    ultimoTexto: String(m.texto ?? '').slice(0, 120),
    ultimaFecha: m.fecha,
    ultimoAutor: m.autorRol,
    noLeidosEntrenador: FieldValue.increment(delPaciente ? 1 : 0),
    noLeidosPaciente: FieldValue.increment(delPaciente ? 0 : 1),
  }, { merge: true })

  const p = paciente.data()
  if (delPaciente) await enviarPush(p.entrenadorId, { titulo: 'Mensaje nuevo', cuerpo: `${p.nombre} te ha escrito`, url: `/?chat=${pid}` })
  else await enviarPush(p.uid, { titulo: 'Mensaje de tu entrenador', cuerpo: 'Tienes un mensaje nuevo', url: '/?chat=1' })
})

// ───────────────────────── Suscripción con Stripe (SOLO MODO PRUEBA) ─────────────────────────
// La clave se guarda como secreto de Firebase (STRIPE_SECRET_KEY), nunca en el repositorio.
// Mientras no se decida empezar a cobrar, el servidor SOLO acepta claves de prueba (sk_test_…):
// con una clave real se niega a funcionar. No hace falta webhook: el estado se sincroniza al
// volver del pago, al abrir la página Suscripción y cada día.
const { defineSecret } = require('firebase-functions/params')
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
// Precio PROVISIONAL (se decidirá tras el estudio de mercado). Céntimos de euro, IVA aparte.
const PRECIO = { centimos: 2900, intervalo: 'month', nombre: 'Entrenamiento Personal · Suscripción del centro' }

function stripe() {
  const clave = STRIPE_SECRET_KEY.value()
  if (!clave?.startsWith('sk_test_')) throw new HttpsError('failed-precondition', 'Los pagos están en modo de prueba y falta una clave de prueba de Stripe.')
  return new (require('stripe'))(clave)
}

// Administrador activo de su centro (aunque el centro esté suspendido: así puede pagar y reactivarlo)
async function adminDeCentro(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.')
  const d = (await getFirestore().doc(`usuarios/${req.auth.uid}`).get()).data()
  if (!d || d.activo !== true || d.rol !== 'admin' || !d.centroId) throw new HttpsError('permission-denied', 'Solo el administrador del centro.')
  return d
}

// Lleva a Firestore el estado de la suscripción de Stripe. Si el centro deja de pagar NO se
// suspende solo: mientras estemos en pruebas lo decide el superadministrador desde Centros.
async function guardarSuscripcion(centroId, sub) {
  const item = sub.items?.data?.[0]
  const fin = item?.current_period_end ?? sub.current_period_end
  const alDia = ['active', 'trialing'].includes(sub.status)
  await getFirestore().doc(`centros/${centroId}`).update({
    plan: alDia ? 'pago' : sub.status === 'canceled' ? 'cancelado' : 'impago',
    suscripcion: { id: sub.id, estado: sub.status, finPeriodo: fin ? Timestamp.fromMillis(fin * 1000) : null, cancelaAlFinal: sub.cancel_at_period_end === true, modoPrueba: sub.livemode === false, actualizada: FieldValue.serverTimestamp() },
  })
}

// Abre el pago de Stripe (Checkout) para el centro de quien llama
exports.crearPagoSuscripcion = onCall({ region: REGION, secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const yo = await adminDeCentro(req)
  const s = stripe()
  const ref = getFirestore().doc(`centros/${yo.centroId}`)
  const centro = (await ref.get()).data()
  if (centro?.plan === 'pago') throw new HttpsError('already-exists', 'Tu centro ya tiene la suscripción activa.')
  let cliente = centro?.stripeClienteId
  if (!cliente) {
    cliente = (await s.customers.create({ email: yo.email, name: centro?.nombre, metadata: { centroId: yo.centroId } })).id
    await ref.update({ stripeClienteId: cliente })
  }
  const origen = /^https?:\/\/(localhost(:\d+)?|readaptacion-app\.web\.app|readaptacion-app\.firebaseapp\.com)$/.test(req.data?.origen ?? '') ? req.data.origen : 'https://readaptacion-app.web.app'
  const sesion = await s.checkout.sessions.create({
    mode: 'subscription', customer: cliente, locale: 'es',
    line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: PRECIO.centimos, recurring: { interval: PRECIO.intervalo }, product_data: { name: PRECIO.nombre } } }],
    client_reference_id: yo.centroId,
    subscription_data: { metadata: { centroId: yo.centroId } },
    success_url: `${origen}/suscripcion?pago={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origen}/suscripcion`,
  })
  return { url: sesion.url }
})

// Comprueba en Stripe el estado del centro de quien llama (al volver del pago o al abrir la página)
exports.sincronizarSuscripcion = onCall({ region: REGION, secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const yo = await adminDeCentro(req)
  const s = stripe()
  const centro = (await getFirestore().doc(`centros/${yo.centroId}`).get()).data()
  if (!centro?.stripeClienteId) return { plan: centro?.plan ?? null }
  const subs = await s.subscriptions.list({ customer: centro.stripeClienteId, status: 'all', limit: 1 })
  if (subs.data[0]) await guardarSuscripcion(yo.centroId, subs.data[0])
  return { ok: true }
})

// Portal de Stripe para cambiar la tarjeta, ver facturas o cancelar
exports.portalSuscripcion = onCall({ region: REGION, secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const yo = await adminDeCentro(req)
  const centro = (await getFirestore().doc(`centros/${yo.centroId}`).get()).data()
  if (!centro?.stripeClienteId) throw new HttpsError('failed-precondition', 'Tu centro aún no tiene suscripción.')
  const origen = /^https?:\/\/(localhost(:\d+)?|readaptacion-app\.web\.app|readaptacion-app\.firebaseapp\.com)$/.test(req.data?.origen ?? '') ? req.data.origen : 'https://readaptacion-app.web.app'
  const p = await stripe().billingPortal.sessions.create({ customer: centro.stripeClienteId, return_url: `${origen}/suscripcion`, locale: 'es' })
  return { url: p.url }
})

// Cada día: sincroniza todas las suscripciones (renovaciones, impagos, cancelaciones)
exports.revisarSuscripciones = onSchedule({ region: REGION, schedule: 'every day 06:00', timeZone: 'Europe/Madrid', secrets: [STRIPE_SECRET_KEY] }, async () => {
  const s = stripe()
  const centros = await getFirestore().collection('centros').where('stripeClienteId', '!=', null).get()
  for (const c of centros.docs) {
    try {
      const subs = await s.subscriptions.list({ customer: c.data().stripeClienteId, status: 'all', limit: 1 })
      if (subs.data[0]) await guardarSuscripcion(c.id, subs.data[0])
    } catch (e) { console.error('suscripción', c.id, e.message) }
  }
})
