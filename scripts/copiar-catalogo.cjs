// Copia ejercicios (con sus fotos), grupos, sistemas y volúmenes de un centro a otro.
// Sirve para "cargar" ejercicios en un centro nuevo o crear el centro de demo.
// Las fotos se copian a la carpeta del ejercicio nuevo: cada centro queda independiente.
// Se puede repetir: lo que ya existe en el destino no se toca.
//
//   node scripts/copiar-catalogo.cjs --origen osteorubi --destino demo --nombre "Centro demo" --por-grupo 5
//
// Opciones: --por-grupo N (solo los N primeros de cada grupo; sin ella, todos)
//           --sin-volumenes (no copia sistemas ni volúmenes)
// Por defecto usa el emulador local. Para la base de datos real: --produccion (SOLO con permiso).
const path = require('path')
const fs = require('fs')
const reqF = require('module').createRequire(path.join(__dirname, '../functions/package.json'))
const { initializeApp } = reqF('firebase-admin/app')
const { getFirestore, FieldValue } = reqF('firebase-admin/firestore')
const { getStorage } = reqF('firebase-admin/storage')

const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined }
const tiene = n => process.argv.includes(`--${n}`)
const origen = arg('origen'), destino = arg('destino')
const porGrupo = arg('por-grupo') ? Number(arg('por-grupo')) : Infinity
const produccion = tiene('produccion')
if (!origen || !destino || origen === destino) { console.error('Indica --origen y --destino (distintos).'); process.exit(1) }
if (!/^[a-z0-9-]+$/.test(destino)) { console.error('El id del destino solo puede tener minúsculas, números y guiones.'); process.exit(1) }

// Mismo bucket que usa la app (.env)
const env = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8')
const bucket = env.match(/VITE_FIREBASE_STORAGE_BUCKET=(.+)/)?.[1].trim()
if (!produccion) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199'
}
const proyecto = produccion ? 'readaptacion-app' : 'demo-readaptacion'

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
const sinPrefijo = id => id.startsWith(`${origen}_`) ? id.slice(origen.length + 1) : id
const nuevoId = id => `${destino}_${sinPrefijo(id)}`

async function main() {
  initializeApp({ projectId: proyecto, storageBucket: bucket })
  const db = getFirestore()
  const almacen = getStorage().bucket()
  console.log(`${produccion ? 'PRODUCCIÓN' : 'Emulador'} · ${origen} → ${destino}`)

  const cRef = db.doc(`centros/${destino}`)
  if (!(await cRef.get()).exists) {
    await cRef.set({ nombre: arg('nombre') ?? destino, estado: 'activo', creado: FieldValue.serverTimestamp() })
    console.log(`Centro creado: ${arg('nombre') ?? destino}`)
  }
  const existe = async ruta => (await db.doc(ruta).get()).exists
  const delOrigen = n => db.collection(n).where('centroId', '==', origen).get()

  // Grupos y ejercicios
  const grupos = (await delOrigen('gruposMusculares')).docs.sort((a, b) => (a.data().orden ?? 0) - (b.data().orden ?? 0))
  let nEj = 0, nFotos = 0
  for (const g of grupos) {
    const gid = nuevoId(g.id)
    if (!(await existe(`gruposMusculares/${gid}`))) await db.doc(`gruposMusculares/${gid}`).set({ ...g.data(), centroId: destino })
    const ejs = (await db.collection('ejercicios').where('centroId', '==', origen).where('grupoId', '==', g.id).get())
      .docs.sort((a, b) => (a.data().orden ?? 0) - (b.data().orden ?? 0)).slice(0, porGrupo)
    for (const e of ejs) {
      // El id del ejercicio empieza por el de su grupo: se cambia solo ese principio
      const resto = e.id.startsWith(`${g.id}-`) ? e.id.slice(g.id.length + 1) : slug(e.data().nombre)
      const eid = `${gid}-${resto}`
      if (await existe(`ejercicios/${eid}`)) continue
      const fotos = []
      for (const f of e.data().fotos ?? []) {
        const nueva = `ejercicios/${eid}/${path.posix.basename(f)}`
        try { await almacen.file(f).copy(almacen.file(nueva)); fotos.push(nueva); nFotos++ }
        catch (err) { console.warn(`  Foto no copiada (${f}): ${err.message}`) }
      }
      await db.doc(`ejercicios/${eid}`).set({ ...e.data(), grupoId: gid, fotos, centroId: destino, origen: `copiado de ${origen}` })
      nEj++
    }
  }
  console.log(`Grupos: ${grupos.length} · ejercicios copiados: ${nEj} · fotos: ${nFotos}`)

  // Sistemas y volúmenes (para poder montar rutinas de ejemplo)
  if (!tiene('sin-volumenes')) {
    const sistemas = await delOrigen('sistemasEntrenamiento')
    for (const s of sistemas.docs) {
      if (!(await existe(`sistemasEntrenamiento/${nuevoId(s.id)}`))) await db.doc(`sistemasEntrenamiento/${nuevoId(s.id)}`).set({ ...s.data(), centroId: destino })
    }
    const vols = await delOrigen('volumenes')
    for (const v of vols.docs) {
      const vid = nuevoId(v.id)
      if (await existe(`volumenes/${vid}`)) continue
      await db.doc(`volumenes/${vid}`).set({ ...v.data(), sistemaId: nuevoId(v.data().sistemaId ?? ''), centroId: destino })
    }
    console.log(`Sistemas: ${sistemas.size} · volúmenes: ${vols.size}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
