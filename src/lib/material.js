// Material de los ejercicios: lista fija y detección a partir del nombre.
// Cada ejercicio guarda `material: [ids]` (puede tener varios). Si no tiene el campo, es «Sin clasificar».
// La detección también la usa scripts/rellenar-material.cjs para rellenar los ejercicios existentes.

export const MATERIALES = [
  { id: 'mancuernas', nombre: 'Mancuernas', patron: /mancuern/ },
  { id: 'barra', nombre: 'Barra', patron: /\bbarra\b/ },
  { id: 'kettlebell', nombre: 'Kettlebell', patron: /kettle ?bell|pesa rusa/ },
  { id: 'disco', nombre: 'Disco', patron: /\bdisco\b/ },
  { id: 'maquina', nombre: 'Máquina', patron: /maquina|\bprensa\b|\bsmith\b|multipower|\bhack\b/ },
  { id: 'polea', nombre: 'Polea', patron: /polea|\bcable/ },
  { id: 'banda', nombre: 'Banda elástica', patron: /\bbanda|\bgoma|elastic|mini ?band/ },
  { id: 'trx', nombre: 'TRX', patron: /\btrx\b|suspension/ },
  { id: 'fitball', nombre: 'Fitball', patron: /fit ?ball|pelota suiza|swiss ?ball/ },
  { id: 'bosu', nombre: 'Bosu', patron: /\bbos+u\b/ },
  { id: 'balon', nombre: 'Balón medicinal', patron: /balon medicinal|medicine ?ball|slam ?ball/ },
  { id: 'landmine', nombre: 'Landmine', patron: /land ?mine/ },
  { id: 'banco', nombre: 'Banco', patron: /\bbanco\b/ },
  { id: 'step', nombre: 'Step / cajón', patron: /\bstep\b|\bcajon\b|\bbox\b/ },
  { id: 'corporal', nombre: 'Peso corporal', patron: /peso corporal|sin material/ },
]

export const SIN_CLASIFICAR = 'sin-clasificar'
export const nombreMaterial = id => MATERIALES.find(m => m.id === id)?.nombre ?? id

const normalizar = t => (t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Materiales que se deducen del nombre del ejercicio (puede devolver una lista vacía)
export const detectarMaterial = nombre => {
  const t = normalizar(nombre)
  return MATERIALES.filter(m => m.patron.test(t)).map(m => m.id)
}

// ¿Pasa el ejercicio el filtro? (filtro vacío = todos)
export const cumpleMaterial = (ejercicio, filtro) => {
  if (!filtro) return true
  const m = ejercicio.material ?? []
  return filtro === SIN_CLASIFICAR ? m.length === 0 : m.includes(filtro)
}
