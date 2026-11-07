// Carga ejercicios y fotos en Firestore + Storage. Se puede ejecutar varias veces sin duplicar.
// Uso: node subir.js <ruta-clave.json> [--solo-probar]
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const keyPath = process.argv[2];
const dryRun = process.argv.includes('--solo-probar');
if (!keyPath) { console.error('Uso: node subir.js <ruta-clave.json> [--solo-probar]'); process.exit(1); }

const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function elegirBucket() {
  for (const n of [`${key.project_id}.firebasestorage.app`, `${key.project_id}.appspot.com`]) {
    const b = admin.storage().bucket(n);
    try { const [ok] = await b.exists(); if (ok) return b; } catch (e) { /* probar el siguiente */ }
  }
  throw new Error('No encuentro el bucket de Storage. ¿Está activado?');
}

(async () => {
  const ejercicios = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'ejercicios.json'), 'utf8'));
  const bucket = dryRun ? null : await elegirBucket();
  if (bucket) console.log('Bucket:', bucket.name);

  // Grupos (uno por valor distinto de "grupo", en orden de aparición)
  const grupos = [...new Set(ejercicios.map(e => e.grupo))];
  for (const [i, nombre] of grupos.entries()) {
    const id = slug(nombre);
    console.log(`Grupo: ${id}`);
    if (!dryRun) await db.collection('grupos').doc(id).set({ nombre, orden: i + 1 }, { merge: true });
  }

  for (const e of ejercicios) {
    const fotos = [];
    for (const f of e.fotos) {
      const destino = `ejercicios/${e.id}/${path.basename(f)}`;
      fotos.push(destino);
      if (!dryRun) await bucket.upload(path.join(__dirname, 'data', f), { destination: destino, metadata: { cacheControl: 'public,max-age=31536000' } });
    }
    const ref = db.collection('ejercicios').doc(e.id);
    const datos = { nombre: e.nombre, grupoId: slug(e.grupo), grupoNombre: e.grupo, fotos, orden: e.orden, origen: e.origen };
    if (!dryRun) {
      const snap = await ref.get();
      if (!snap.exists) datos.videos = [];   // no pisar enlaces añadidos a mano
      await ref.set(datos, { merge: true });
    }
    console.log(`${dryRun ? '[prueba] ' : ''}${e.nombre}: ${fotos.length} fotos`);
  }
  console.log(dryRun ? 'Prueba terminada (no se ha subido nada).' : `Hecho: ${ejercicios.length} ejercicios cargados.`);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
