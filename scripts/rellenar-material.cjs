// Rellena el material de los ejercicios a partir de su nombre (src/lib/material.js).
// Solo AÑADE el campo `material` a los ejercicios que aún no lo tienen y cuyo nombre lo indica;
// los demás se quedan «Sin clasificar» y nunca se toca nada de lo que ya tenga material.
// Se puede repetir sin problema.
//
//   node scripts/rellenar-material.cjs                 (emulador local)
//   node scripts/rellenar-material.cjs --centro osteorubi
//   node scripts/rellenar-material.cjs --produccion    (base de datos real: SOLO con permiso)
const path = require('path')
const { pathToFileURL } = require('url')
const reqF = require('module').createRequire(path.join(__dirname, '../functions/package.json'))
const { initializeApp } = reqF('firebase-admin/app')
const { getFirestore } = reqF('firebase-admin/firestore')

const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined }
const produccion = process.argv.includes('--produccion')
const centro = arg('centro')
if (!produccion) process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'

async function main() {
  const { detectarMaterial } = await import(pathToFileURL(path.join(__dirname, '../src/lib/material.js')).href)
  initializeApp({ projectId: produccion ? 'readaptacion-app' : 'demo-readaptacion' })
  const db = getFirestore()
  let q = db.collection('ejercicios')
  if (centro) q = q.where('centroId', '==', centro)
  const ejs = await q.get()
  const cambios = ejs.docs
    .filter(d => !Array.isArray(d.data().material))
    .map(d => ({ ref: d.ref, material: detectarMaterial(d.data().nombre) }))
    .filter(c => c.material.length)
  for (let i = 0; i < cambios.length; i += 400) {
    const lote = db.batch()
    cambios.slice(i, i + 400).forEach(c => lote.update(c.ref, { material: c.material }))
    await lote.commit()
  }
  const yaTenian = ejs.docs.filter(d => Array.isArray(d.data().material)).length
  console.log(`${ejs.size} ejercicios: ${cambios.length} con material añadido, ${yaTenian} ya lo tenían, ${ejs.size - cambios.length - yaTenian} sin clasificar.`)
}
main().catch(e => { console.error(e); process.exit(1) })
