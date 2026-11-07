export const slug = (s, max = 80) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max).replace(/-$/, '')

// Para buscar sin importar mayúsculas ni tildes
export const normalizar = s =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Reduce una foto a WebP de 1200 px como máximo (igual que la carga inicial del catálogo)
export async function comprimirImagen(archivo, lado = 1200, calidad = 0.8) {
  const bmp = await createImageBitmap(archivo)
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(bmp.width * escala)
  lienzo.height = Math.round(bmp.height * escala)
  lienzo.getContext('2d').drawImage(bmp, 0, 0, lienzo.width, lienzo.height)
  return new Promise((ok, fallo) =>
    lienzo.toBlob(b => (b ? ok(b) : fallo(new Error('No se pudo comprimir la imagen'))), 'image/webp', calidad))
}

// Quita los campos vacíos para no guardar basura en Firestore
export function sinVacios(obj) {
  const r = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue
    if (typeof v === 'object' && !Array.isArray(v)) {
      const sub = sinVacios(v)
      if (Object.keys(sub).length) r[k] = sub
    } else r[k] = v
  }
  return r
}
