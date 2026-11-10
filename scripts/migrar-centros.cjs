// Pasa los datos actuales (sin centro) al centro Osteorubi.
// Se puede repetir: solo toca documentos que aún no tienen centroId.
//
//   Emulador:    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrar-centros.cjs demo-readaptacion
//   Producción:  SOLO con permiso explícito → node scripts/migrar-centros.cjs readaptacion-app --produccion
// firebase-admin está instalado en functions/
const reqF = require('module').createRequire(require('path').join(__dirname, '../functions/package.json'))
const { initializeApp } = reqF('firebase-admin/app')
const { getFirestore, FieldValue } = reqF('firebase-admin/firestore')

const proyecto = process.argv[2]
const produccion = process.argv.includes('--produccion')
if (!proyecto) { console.error('Indica el proyecto.'); process.exit(1) }
if (!process.env.FIRESTORE_EMULATOR_HOST && !produccion) {
  console.error('Sin emulador: para tocar la base de datos real hay que añadir --produccion (y tener permiso).')
  process.exit(1)
}

const CENTRO = { id: 'osteorubi', nombre: 'Osteorubi', logo: '/centros/osteorubi.jpg', estado: 'activo' }
const COLECCIONES = ['usuarios', 'pacientes', 'ejercicios', 'gruposMusculares', 'volumenes', 'sistemasEntrenamiento', 'avisos', 'chats']

async function main() {
  initializeApp({ projectId: proyecto })
  const db = getFirestore()
  const ref = db.doc(`centros/${CENTRO.id}`)
  if (!(await ref.get()).exists) {
    const { id, ...datos } = CENTRO
    await ref.set({ ...datos, creado: FieldValue.serverTimestamp() })
    console.log(`Centro creado: ${CENTRO.nombre}`)
  }
  for (const nombre of COLECCIONES) {
    const snap = await db.collection(nombre).get()
    const sin = snap.docs.filter(d => !d.data().centroId)
    for (let i = 0; i < sin.length; i += 400) {
      const lote = db.batch()
      sin.slice(i, i + 400).forEach(d => lote.update(d.ref, { centroId: CENTRO.id }))
      await lote.commit()
    }
    console.log(`${nombre}: ${sin.length} de ${snap.size} pasados a ${CENTRO.nombre}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
