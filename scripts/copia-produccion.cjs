// Copia de seguridad COMPLETA (solo lectura) de la base de datos real a un archivo local.
// Recorre todas las colecciones y subcolecciones y guarda cada documento tal cual (formato REST).
// Usa la sesión de `firebase login` de este ordenador. El archivo va a copias/ (fuera de git:
// contiene datos de salud).
//
//   node scripts/copia-produccion.cjs copias/produccion-AAAA-MM-DD.json
//   node scripts/copia-produccion.cjs --comparar copias/antes.json copias/despues.json
const fs = require('fs')
const path = require('path')
const os = require('os')

function firebaseTools() {
  const npmGlobal = process.env.APPDATA ? path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/') : path.join(os.homedir(), '.npm-global/lib/node_modules/firebase-tools/lib/')
  return { configstore: require(npmGlobal + 'configstore.js').configstore, auth: require(npmGlobal + 'auth.js') }
}

const BASE = 'https://firestore.googleapis.com/v1/projects/readaptacion-app/databases/(default)/documents'

async function copiar(salida) {
  const { configstore, auth } = firebaseTools()
  const token = (await auth.getAccessToken(configstore.get('tokens').refresh_token, [])).access_token
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const llama = async (url, opt = {}) => {
    const r = await fetch(url, { headers: H, ...opt })
    if (!r.ok) throw new Error(`${r.status} ${url}: ${(await r.text()).slice(0, 300)}`)
    return r.json()
  }
  const docs = []
  const colecciones = async padre => {
    const ids = []; let pageToken
    do {
      const r = await llama(`${padre}:listCollectionIds`, { method: 'POST', body: JSON.stringify({ pageSize: 300, pageToken }) })
      ids.push(...(r.collectionIds ?? [])); pageToken = r.nextPageToken
    } while (pageToken)
    return ids
  }
  const recorrer = async (padre, coleccion) => {
    let pageToken
    do {
      const r = await llama(`${padre}/${coleccion}?pageSize=300&showMissing=true${pageToken ? `&pageToken=${pageToken}` : ''}`)
      for (const d of r.documents ?? []) {
        if (d.fields || d.createTime) docs.push(d)
        for (const sub of await colecciones(`https://firestore.googleapis.com/v1/${d.name}`)) await recorrer(`https://firestore.googleapis.com/v1/${d.name}`, sub)
      }
      pageToken = r.nextPageToken
    } while (pageToken)
  }
  for (const c of await colecciones(BASE)) await recorrer(BASE, c)
  fs.mkdirSync(path.dirname(salida), { recursive: true })
  fs.writeFileSync(salida, JSON.stringify({ fecha: new Date().toISOString(), documentos: docs }))
  const porColeccion = {}
  for (const d of docs) {
    const k = d.name.split('/documents/')[1].split('/').filter((_, i) => i % 2 === 0).join('/')
    porColeccion[k] = (porColeccion[k] ?? 0) + 1
  }
  console.log(`Documentos copiados: ${docs.length}`)
  console.log(porColeccion)
}

// Compara dos copias: qué falta, qué ha cambiado (con orden de claves normalizado) y qué es nuevo
function comparar(a, b) {
  const leer = f => new Map(JSON.parse(fs.readFileSync(f)).documentos.map(d => [d.name, d.fields]))
  const ord = x => (x && typeof x === 'object' ? (Array.isArray(x) ? x.map(ord) : Object.fromEntries(Object.keys(x).sort().map(k => [k, ord(x[k])]))) : x)
  const corto = n => n.split('/documents/')[1].replace(/pacientes\/[^/]+/, 'pacientes/…')
  const A = leer(a), B = leer(b)
  const faltan = [], cambiados = [], nuevos = []
  for (const [k, v] of A) { if (!B.has(k)) faltan.push(corto(k)); else if (JSON.stringify(ord(v)) !== JSON.stringify(ord(B.get(k)))) cambiados.push(corto(k)) }
  for (const k of B.keys()) if (!A.has(k)) nuevos.push(corto(k))
  console.log({ faltan: faltan.length, cambiados: cambiados.length, nuevos: nuevos.length })
  if (faltan.length) console.log('Faltan:', faltan.slice(0, 20))
  if (cambiados.length) console.log('Cambiados:', cambiados.slice(0, 20))
  if (nuevos.length) console.log('Nuevos:', nuevos.slice(0, 20))
}

const args = process.argv.slice(2)
if (args[0] === '--comparar') comparar(args[1], args[2])
else if (args[0]) copiar(args[0]).catch(e => { console.error(e.message); process.exit(1) })
else { console.error('Indica el archivo de salida, p. ej. copias/produccion-hoy.json'); process.exit(1) }
