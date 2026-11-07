// Sube el catálogo (data/) a Firestore y Storage con el modelo de ESPECIFICACION.md (sección 6).
// Uso:  npm run subir -- --solo-probar     (no sube nada; solo cuenta y comprueba)
//       npm run subir                      (subida real)
//
// Autenticación: reutiliza la sesión de `firebase login` (no hace falta clave de cuenta de servicio).
// Se puede repetir sin duplicar: los documentos se sobrescriben por id, las fotos ya subidas
// (mismo tamaño) se saltan y los `videos` de un ejercicio existente no se tocan.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const RAIZ = path.resolve(import.meta.dirname, '..')
const DATA = path.join(RAIZ, 'data')
const PROYECTO = 'readaptacion-app'
const BUCKET = `${PROYECTO}.firebasestorage.app`
const DB = `projects/${PROYECTO}/databases/(default)`
const solo = process.argv.includes('--solo-probar')

// --- Autenticación con la sesión del CLI de Firebase ---
const CLI = path.join(process.env.APPDATA ?? '', 'npm/node_modules/firebase-tools/lib/')
let token = null, tokenHora = 0
async function getToken() {
  if (token && Date.now() - tokenHora < 25 * 60 * 1000) return token
  const { configstore } = require(CLI + 'configstore.js')
  const auth = require(CLI + 'auth.js')
  const tk = configstore.get('tokens')
  if (!tk?.refresh_token) throw new Error('No hay sesión de Firebase CLI. Ejecuta: firebase login')
  token = (await auth.getAccessToken(tk.refresh_token, [])).access_token
  tokenHora = Date.now()
  return token
}
async function api(url, opciones = {}, intentos = 5) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opciones, headers: { Authorization: `Bearer ${await getToken()}`, ...opciones.headers } })
      if (r.ok) return r
      if ((r.status === 429 || r.status >= 500) && i < intentos) { await new Promise(s => setTimeout(s, 1000 * i)); continue }
      throw new Error(`${r.status} ${r.statusText}: ${(await r.text()).slice(0, 300)}`)
    } catch (e) {
      if (i < intentos && /fetch failed|ECONN|ETIMEDOUT/.test(String(e.cause ?? e))) { await new Promise(s => setTimeout(s, 1000 * i)); continue }
      throw e
    }
  }
}

// --- Conversión a valores de Firestore ---
const valor = v =>
  typeof v === 'string' ? { stringValue: v }
    : typeof v === 'number' ? { integerValue: String(v) }
      : typeof v === 'boolean' ? { booleanValue: v }
        : Array.isArray(v) ? { arrayValue: { values: v.map(valor) } }
          : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valor(x)])) } }
const campos = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, valor(v)]))

async function idsExistentes(coleccion) {
  const ids = new Set()
  let pagina = ''
  do {
    const r = await (await api(`https://firestore.googleapis.com/v1/${DB}/documents/${coleccion}?pageSize=1000&mask.fieldPaths=nombre${pagina ? `&pageToken=${pagina}` : ''}`)).json()
    for (const d of r.documents ?? []) ids.add(d.name.split('/').pop())
    pagina = r.nextPageToken
  } while (pagina)
  return ids
}

async function escribirLote(escrituras) {
  for (let i = 0; i < escrituras.length; i += 400) {
    await api(`https://firestore.googleapis.com/v1/${DB}/documents:commit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: escrituras.slice(i, i + 400) }),
    })
  }
}

async function fotosEnStorage() {
  const mapa = new Map()
  let pagina = ''
  do {
    const r = await (await api(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o?prefix=ejercicios/&fields=items(name,size),nextPageToken&maxResults=1000${pagina ? `&pageToken=${pagina}` : ''}`)).json()
    for (const o of r.items ?? []) mapa.set(o.name, Number(o.size))
    pagina = r.nextPageToken
  } while (pagina)
  return mapa
}

async function subirFoto(origen, destino) {
  const datos = fs.readFileSync(origen)
  const limite = `----readaptacion${Date.now()}${Math.random().toString(16).slice(2)}`
  const meta = JSON.stringify({ name: destino, contentType: 'image/webp', cacheControl: 'public,max-age=31536000' })
  const cuerpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${limite}\r\nContent-Type: image/webp\r\n\r\n`),
    datos, Buffer.from(`\r\n--${limite}--`),
  ])
  await api(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`, {
    method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${limite}` }, body: cuerpo,
  })
}

async function enParalelo(lista, n, tarea) {
  let i = 0, hechas = 0
  const trabajadores = Array.from({ length: n }, async () => {
    while (i < lista.length) {
      const item = lista[i++]
      await tarea(item)
      if (++hechas % 250 === 0) console.log(`  ${hechas}/${lista.length}`)
    }
  })
  await Promise.all(trabajadores)
}

const grupos = JSON.parse(fs.readFileSync(path.join(DATA, 'grupos.json'), 'utf8'))
const ejercicios = JSON.parse(fs.readFileSync(path.join(DATA, 'ejercicios.json'), 'utf8'))

// Comprobaciones antes de tocar nada
const idsGrupo = new Set(grupos.map(g => g.id))
const duplicados = ejercicios.map(e => e.id).filter((id, i, a) => a.indexOf(id) !== i)
if (duplicados.length) throw new Error(`Ids de ejercicio repetidos: ${duplicados.slice(0, 5).join(', ')}`)
for (const e of ejercicios) {
  if (!idsGrupo.has(e.grupoId)) throw new Error(`Grupo desconocido en ${e.id}: ${e.grupoId}`)
  for (const f of e.fotos) if (!fs.existsSync(path.join(DATA, f))) throw new Error(`Falta la foto ${f}`)
}
const totalFotos = ejercicios.reduce((s, e) => s + e.fotos.length, 0)
console.log(`${solo ? '[PRUEBA] ' : ''}${grupos.length} grupos, ${ejercicios.length} ejercicios, ${totalFotos} fotos`)

const destinoFoto = (e, f) => `ejercicios/${e.id}/${path.basename(f).slice(e.id.length + 1)}`
const existentesGrupos = await idsExistentes('gruposMusculares')
const existentesEj = await idsExistentes('ejercicios')
const enStorage = await fotosEnStorage()
const pendientes = []
for (const e of ejercicios) for (const f of e.fotos) {
  const dest = destinoFoto(e, f)
  if (enStorage.get(dest) !== fs.statSync(path.join(DATA, f)).size) pendientes.push({ origen: path.join(DATA, f), destino: dest })
}
console.log(`En Firestore ya hay ${existentesGrupos.size} grupos y ${existentesEj.size} ejercicios. Fotos por subir: ${pendientes.length} (ya subidas: ${totalFotos - pendientes.length}).`)
if (solo) { console.log('Prueba terminada: no se ha subido nada.'); process.exit(0) }

console.log('Subiendo fotos…')
await enParalelo(pendientes, 8, p => subirFoto(p.origen, p.destino))

console.log('Escribiendo grupos y ejercicios…')
const escrituras = [
  ...grupos.map(g => ({
    update: { name: `${DB}/documents/gruposMusculares/${g.id}`, fields: campos({ nombre: g.nombre, orden: g.orden }) },
  })),
  ...ejercicios.map(e => {
    const datos = { nombre: e.nombre, grupoId: e.grupoId, grupoNombre: e.grupoNombre, fotos: e.fotos.map(f => destinoFoto(e, f)), orden: e.orden, origen: e.origen }
    const nuevo = !existentesEj.has(e.id)
    if (nuevo) datos.videos = [] // no pisar enlaces añadidos a mano
    return { update: { name: `${DB}/documents/ejercicios/${e.id}`, fields: campos(datos) }, updateMask: { fieldPaths: Object.keys(datos) } }
  }),
]
await escribirLote(escrituras)
console.log(`Hecho: ${grupos.length} grupos y ${ejercicios.length} ejercicios cargados, ${pendientes.length} fotos subidas.`)
