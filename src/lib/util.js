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

export const URL_APP = 'https://readaptacion-app.web.app'

// Enlace que abre un chat de WhatsApp con el teléfono dado (si no hay teléfono, abre WhatsApp sin destinatario).
// Los números de 9 cifras se toman como españoles (+34).
export function enlaceWhatsApp(telefono, texto) {
  let n = (telefono ?? '').replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^00/, '')
  if (n.length === 9) n = '34' + n
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

// Foto de perfil: recorte cuadrado centrado, 192 px, WebP. Devuelve un texto (data URL) de pocos KB.
export async function fotoDePerfil(archivo, lado = 192, calidad = 0.82) {
  const bmp = await createImageBitmap(archivo)
  const m = Math.min(bmp.width, bmp.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = lado
  lienzo.getContext('2d').drawImage(bmp, (bmp.width - m) / 2, (bmp.height - m) / 2, m, m, 0, 0, lado, lado)
  return lienzo.toDataURL('image/webp', calidad)
}
