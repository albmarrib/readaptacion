// Datos de ejemplo para revisar la app en local, SOLO en el emulador (nunca en la base de datos real).
// Borra lo que haya en el emulador y crea el centro Osteorubi con un administrador, un paciente,
// catálogo, volúmenes y dos rutinas (una cerrada y una activa) para ver la evolución.
//
//   1) firebase emulators:start --project demo-readaptacion
//   2) node scripts/sembrar-emulador.cjs
//   3) VITE_EMULADOR=1 npx vite   → entrar con una de las cuentas de prueba de abajo
const path = require('path')
const reqF = require('module').createRequire(path.join(__dirname, '../functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
const P = 'demo-readaptacion'
const { initializeApp } = reqF('firebase-admin/app')
const { getFirestore, Timestamp } = reqF('firebase-admin/firestore')
const { getAuth } = reqF('firebase-admin/auth')

// Cuentas de prueba (solo existen en el emulador de este ordenador)
const CLAVE = 'prueba-local-123'
const CUENTAS = [
  { uid: 'admin-prueba', email: 'admin@prueba.test', nombre: 'Marcos (prueba)', rol: 'admin' },
  // Dueño de la app: superadministrador en su propio centro, KinetiQ
  { uid: 'super-prueba', email: 'super@prueba.test', nombre: 'Albert (prueba)', rol: 'admin', centroId: 'kinetiq', superadmin: true },
  { uid: 'paciente-prueba', email: 'paciente@prueba.test', nombre: 'Ana García', rol: 'paciente', pacienteId: 'ana' },
  // Otro centro, para ver el panel de centros y la separación de datos
  { uid: 'admin-otro', email: 'otro@prueba.test', nombre: 'Laura (Centro Norte)', rol: 'admin', centroId: 'centro-norte' },
]

const dia = d => { const f = new Date(); f.setHours(12, 0, 0, 0); f.setDate(f.getDate() + d); return Timestamp.fromDate(f) }
const diaSemana = desplazamiento => ((new Date().getDay() + 6 + desplazamiento) % 7) + 1

async function main() {
  initializeApp({ projectId: P })
  const db = getFirestore(), auth = getAuth()
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${P}/databases/(default)/documents`, { method: 'DELETE' })
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' })

  const C = 'osteorubi'
  await db.doc(`centros/${C}`).set({ nombre: 'Osteorubi', logo: '/centros/osteorubi.jpg', estado: 'activo', creado: Timestamp.now() })
  await db.doc('centros/kinetiq').set({ nombre: 'KinetiQ Entrenamiento Personal', estado: 'activo', creado: Timestamp.now() })
  await db.doc('centros/centro-norte').set({ nombre: 'Centro Norte', estado: 'activo', creado: Timestamp.now() })
  await db.doc('pacientes/norte1').set({ nombre: 'Paciente de Centro Norte', entrenadorId: 'admin-otro', estado: 'activo', centroId: 'centro-norte' })
  for (const { uid, email, nombre, rol, pacienteId, superadmin, centroId = C } of CUENTAS) {
    await auth.createUser({ uid, email, password: CLAVE, displayName: nombre, emailVerified: true })
    await db.doc(`usuarios/${uid}`).set({ rol, nombre, email, activo: true, centroId, ...(rol === 'admin' ? { puedeEditarCatalogo: true } : { pacienteId }), ...(superadmin ? { superadmin: true } : {}) })
  }

  // Catálogo
  const grupos = [['dorsal', 'Dorsal', ['Jalón al pecho', 'Remo con mancuerna', 'Pull over en polea']],
    ['pectoral', 'Pectoral', ['Press de banca con mancuernas', 'Push up inclinado']],
    ['piernas', 'Piernas', ['Sentadilla goblet', 'Zancada atrás', 'Puente de glúteo']]]
  const ej = {}
  for (const [i, [g, nombre, lista]] of grupos.entries()) {
    await db.doc(`gruposMusculares/${g}`).set({ nombre, orden: i + 1, centroId: C })
    for (const [k, n] of lista.entries()) {
      const id = `${g}-${n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}`
      ej[n] = id
      await db.doc(`ejercicios/${id}`).set({ nombre: n, grupoId: g, grupoNombre: nombre, orden: k + 1, fotos: [], videos: k === 0 ? ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'] : [], centroId: C })
    }
  }
  await db.doc('sistemasEntrenamiento/series').set({ nombre: 'Series', centroId: C })
  await db.doc('volumenes/v4x10').set({ sistemaId: 'series', lineas: [{ series: 4, tramos: [10] }], seriesTotales: 4, observaciones: '', centroId: C })
  await db.doc('volumenes/v3x12').set({ sistemaId: 'series', lineas: [{ series: 3, tramos: [12] }], seriesTotales: 3, observaciones: '', centroId: C })

  // Paciente con dos rutinas
  await db.doc('pacientes/ana').set({ nombre: 'Ana García', email: 'paciente@prueba.test', entrenadorId: 'admin-prueba', estado: 'activo', uid: 'paciente-prueba', centroId: C,
    consentimiento: { fecha: Timestamp.now(), version: '1.0' }, objetivo: 'Recuperar la movilidad del hombro y ganar fuerza' })
  const rutina = async (rid, numero, estado, inicio, fin, pesos) => {
    await db.doc(`pacientes/ana/rutinas/${rid}`).set({ numero, estado, temporada: 2026, semanas: 5, fechaInicio: dia(inicio), fechaFin: dia(fin),
      notaGeneral: 'Calienta 10 minutos antes de empezar y bebe agua entre series.',
      dias: [{ numero: 1, titulo: 'Tren superior', gruposIds: ['dorsal', 'pectoral'], diaSemana: diaSemana(0) },
             { numero: 2, titulo: 'Tren inferior', gruposIds: ['piernas'], diaSemana: diaSemana(2) }] })
    const lineas = [
      [1, 'dorsal', 'Jalón al pecho', [{ series: 4, tramos: [10] }], 4],
      [1, 'dorsal', 'Remo con mancuerna', [{ series: 3, tramos: [12] }], 3],
      [1, 'pectoral', 'Press de banca con mancuernas', [{ series: 4, tramos: [10] }], 4],
      [2, 'piernas', 'Sentadilla goblet', [{ series: 4, tramos: [12] }], 4],
      [2, 'piernas', 'Puente de glúteo', [{ series: 3, tramos: [15] }], 3]]
    for (const [k, [d, g, n, l, s]] of lineas.entries()) {
      await db.doc(`pacientes/ana/rutinas/${rid}/ejercicios/e${k + 1}`).set({ dia: d, orden: k + 1, grupoId: g, ejercicioId: ej[n], nombre: n, lineas: l, seriesTotales: s, pesos: pesos[k] != null ? { 0: pesos[k] } : {}, observaciones: '' })
    }
  }
  await rutina('r1', 1, 'cerrada', -50, -15, [25, 10, 10, 12, null])
  await rutina('r2', 2, 'activa', -14, 21, [32.5, 14, 12, 16, null])
  console.log('Emulador listo con datos de ejemplo de Osteorubi. Cuentas:', CUENTAS.map(c => c.email).join(', '))
}
main().catch(e => { console.error(e); process.exit(1) })
