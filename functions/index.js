const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')

initializeApp()
const REGION = 'europe-west1'

// Devuelve el perfil del usuario que llama si está activo y es administrador o entrenador.
async function personalActivo(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.')
  const yo = await getFirestore().doc(`usuarios/${req.auth.uid}`).get()
  const d = yo.data()
  if (!yo.exists || d.activo !== true || !['admin', 'entrenador'].includes(d.rol)) {
    throw new HttpsError('permission-denied', 'No tienes permiso para hacer esto.')
  }
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
  if (yo.rol !== 'admin' && snap.data().entrenadorId !== req.auth.uid) {
    throw new HttpsError('permission-denied', 'Este paciente no es tuyo.')
  }
  return { ref, pacienteId, ficha: snap.data() }
}

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
  await ref.set({ rol: 'entrenador', nombre, email, activo: true, puedeEditarCatalogo })
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
  const lote = getFirestore().batch()
  lote.set(uRef, { rol: 'paciente', nombre: ficha.nombre, email, activo: true, pacienteId })
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
      entrenadorId: paciente.data().entrenadorId, pacienteId: pacienteRef.id, rutinaId: r.id,
      tipo: 'rutina_vencida', fecha: FieldValue.serverTimestamp(), leido: false,
    })
    await lote.commit()
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
    ultimoTexto: String(m.texto ?? '').slice(0, 120),
    ultimaFecha: m.fecha,
    ultimoAutor: m.autorRol,
    noLeidosEntrenador: FieldValue.increment(delPaciente ? 1 : 0),
    noLeidosPaciente: FieldValue.increment(delPaciente ? 0 : 1),
  }, { merge: true })
})
