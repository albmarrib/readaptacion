const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

admin.initializeApp()
const REGION = 'europe-west1'

// Alta de entrenadores: solo la puede hacer un administrador activo.
// Crea (o reutiliza) la cuenta de acceso con ese correo y su perfil en usuarios/{uid}.
// El entrenador entra después con Google o con enlace al correo; el cliente nunca se asigna rol.
exports.crearEntrenador = onCall({ region: REGION }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.')
  const db = admin.firestore()

  const yo = await db.doc(`usuarios/${req.auth.uid}`).get()
  if (!yo.exists || yo.data().rol !== 'admin' || yo.data().activo !== true) {
    throw new HttpsError('permission-denied', 'Solo el administrador puede dar de alta entrenadores.')
  }

  const email = String(req.data?.email ?? '').trim().toLowerCase()
  const nombre = String(req.data?.nombre ?? '').trim()
  const puedeEditarCatalogo = req.data?.puedeEditarCatalogo === true
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'El correo no es válido.')
  if (nombre.length < 2 || nombre.length > 120) throw new HttpsError('invalid-argument', 'Escribe el nombre del entrenador.')

  let user
  try {
    user = await admin.auth().getUserByEmail(email)
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e
    user = await admin.auth().createUser({ email, emailVerified: true, displayName: nombre })
  }

  const ref = db.doc(`usuarios/${user.uid}`)
  if ((await ref.get()).exists) throw new HttpsError('already-exists', 'Ya existe un usuario con ese correo.')
  await ref.set({ rol: 'entrenador', nombre, email, activo: true, puedeEditarCatalogo })
  return { uid: user.uid }
})
