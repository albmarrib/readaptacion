// Crea (o repara) la cuenta del administrador: usuario de acceso + perfil en usuarios/{uid}.
// Uso: node scripts/crear-admin.js correo@ejemplo.com "Nombre Apellido"
// Reutiliza la sesión de `firebase login`; no necesita clave de cuenta de servicio.
// Solo hace falta una vez: los demás entrenadores los da de alta el administrador desde la app.

import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const PROYECTO = 'readaptacion-app'
const [email, nombre] = [process.argv[2]?.trim().toLowerCase(), process.argv[3]?.trim()]
if (!email || !nombre) { console.error('Uso: node scripts/crear-admin.js correo "Nombre"'); process.exit(1) }

const CLI = path.join(process.env.APPDATA ?? '', 'npm/node_modules/firebase-tools/lib/')
const { configstore } = require(CLI + 'configstore.js')
const auth = require(CLI + 'auth.js')
const token = (await auth.getAccessToken(configstore.get('tokens').refresh_token, [])).access_token

async function llamar(url, cuerpo, metodo = 'POST') {
  const r = await fetch(url, { method: metodo, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROYECTO }, body: cuerpo && JSON.stringify(cuerpo) })
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) }
}

// 1. Cuenta de acceso
const base = `https://identitytoolkit.googleapis.com/v1/projects/${PROYECTO}/accounts`
let uid
const alta = await llamar(base, { email, emailVerified: true, displayName: nombre })
if (alta.ok) uid = alta.json.localId
else if (alta.json.error?.message === 'EMAIL_EXISTS') {
  const busca = await llamar(`${base}:lookup`, { email: [email] })
  uid = busca.json.users?.[0]?.localId
} else throw new Error(`No se pudo crear la cuenta: ${JSON.stringify(alta.json.error)}`)
if (!uid) throw new Error('No se pudo obtener el uid de la cuenta.')

// 2. Perfil en Firestore
const doc = `projects/${PROYECTO}/databases/(default)/documents/usuarios/${uid}`
const campos = {
  rol: { stringValue: 'admin' }, nombre: { stringValue: nombre }, email: { stringValue: email },
  activo: { booleanValue: true }, puedeEditarCatalogo: { booleanValue: true },
}
const perfil = await llamar(`https://firestore.googleapis.com/v1/${doc}`, { fields: campos }, 'PATCH')
if (!perfil.ok) throw new Error(`No se pudo escribir el perfil: ${JSON.stringify(perfil.json.error)}`)
console.log(`Administrador listo: ${nombre} <${email}> (uid ${uid})`)
