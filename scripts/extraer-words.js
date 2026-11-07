// Extrae grupos musculares, ejercicios y fotos de los Word de words/.
// Uso: npm run extraer
// Resultado en data/: grupos.json, ejercicios.json, fotos/, RESUMEN.md, incidencias.xlsx
// No toca los Word ni sube nada a Firebase.
//
// Reglas (ESPECIFICACION.md, secciones 4.1 y 9):
// - El título del documento es el grupo muscular. Si más adelante aparece otro título
//   distinto justo antes de una tabla (p. ej. "ESTIRAMIENTOS"), empieza un grupo nuevo.
// - Cada celda con contenido es un ejercicio: su texto es el nombre y sus imágenes, las fotos.
// - El texto fuera de las tablas también se importa (sin fotos) y se apunta como incidencia.
// - No se corrige ni se descarta nada: las dudas van a incidencias.xlsx.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import JSZip from 'jszip'
import { DOMParser } from '@xmldom/xmldom'
import sharp from 'sharp'
import ExcelJS from 'exceljs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const WORDS = path.join(RAIZ, 'words')
const DATA = path.join(RAIZ, 'data')
const FOTOS = path.join(DATA, 'fotos')
const ORIGINALES = path.join(DATA, 'originales') // imágenes que no se pueden convertir (EMF…)
const LADO_MAX = 1200
const CALIDAD_WEBP = 80

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const slug = (s, max = 80) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max).replace(/-$/, '')
const limpiar = s => s.replace(/\s+/g, ' ').trim()
const hijos = (el, nombre) => Array.from(el.childNodes).filter(n => n.nodeType === 1 && n.localName === nombre)

// Texto de un párrafo: w:t, con tabuladores y saltos como espacio
function textoParrafo(p) {
  let s = ''
  const recorrer = n => {
    if (n.nodeType !== 1) return
    if (n.namespaceURI === W && n.localName === 't') s += n.textContent
    else if (n.namespaceURI === W && (n.localName === 'tab' || n.localName === 'br')) s += ' '
    else for (const c of Array.from(n.childNodes)) recorrer(c)
  }
  recorrer(p)
  return limpiar(s)
}

// Referencias a imágenes dentro de un elemento, en orden de documento
function imagenes(el) {
  const ids = []
  const todos = el.getElementsByTagName('*')
  for (let i = 0; i < todos.length; i++) {
    const n = todos[i]
    if (n.localName === 'blip') {
      const id = n.getAttributeNS(R, 'embed') || n.getAttributeNS(R, 'link')
      if (id) ids.push({ id, externa: !n.getAttributeNS(R, 'embed') })
    } else if (n.localName === 'imagedata') {
      const id = n.getAttributeNS(R, 'id')
      if (id) ids.push({ id, externa: false })
    }
  }
  return ids
}

// Las imágenes EMF de estos Word envuelven una sola foto (registro EMR_STRETCHDIBITS,
// 24/32 bits sin comprimir). Se saca esa foto en píxeles RGB para sharp.
function emfABitmap(b) {
  let o = 0
  while (o + 8 <= b.length) {
    const tipo = b.readUInt32LE(o), tam = b.readUInt32LE(o + 4)
    if (tipo === 81) { // EMR_STRETCHDIBITS
      const bmi = o + b.readUInt32LE(o + 48), bits = o + b.readUInt32LE(o + 56)
      const ancho = b.readInt32LE(bmi + 4), altoFirmado = b.readInt32LE(bmi + 8)
      const bpp = b.readUInt16LE(bmi + 14), comp = b.readUInt32LE(bmi + 16)
      if (comp !== 0 || (bpp !== 24 && bpp !== 32)) throw new Error(`EMF con mapa de bits ${bpp} bits/compresión ${comp}`)
      const alto = Math.abs(altoFirmado), bytesPx = bpp / 8
      const paso = Math.ceil((ancho * bpp) / 32) * 4
      const rgb = Buffer.alloc(ancho * alto * 3)
      for (let y = 0; y < alto; y++) {
        const fila = bits + (altoFirmado > 0 ? alto - 1 - y : y) * paso // positivo = de abajo arriba
        for (let x = 0; x < ancho; x++) {
          const s = fila + x * bytesPx, d = (y * ancho + x) * 3
          rgb[d] = b[s + 2]; rgb[d + 1] = b[s + 1]; rgb[d + 2] = b[s]
        }
      }
      return { datos: rgb, raw: { width: ancho, height: alto, channels: 3 } }
    }
    if (tam < 8) break
    o += tam
  }
  throw new Error('EMF sin mapa de bits')
}

const incidencias = []
const inc = (o) => incidencias.push({ revisado: '', comentario: '', ...o })

async function main() {
  fs.rmSync(FOTOS, { recursive: true, force: true })
  fs.rmSync(ORIGINALES, { recursive: true, force: true })
  fs.mkdirSync(FOTOS, { recursive: true })

  const archivos = fs.readdirSync(WORDS).filter(f => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$'))
    .sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b))

  const grupos = []           // { id, nombre, orden, origen }
  const ejercicios = []
  const idsUsados = new Set()
  const porHash = new Map()   // hash de imagen -> [{ ejercicio, foto, documento }]
  const porNombre = new Map() // nombre normalizado -> [ejercicio]

  for (const archivo of archivos) {
    console.log(`\n== ${archivo}`)
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(WORDS, archivo)))
    const xml = await zip.file('word/document.xml').async('string')
    const rels = new DOMParser().parseFromString(await zip.file('word/_rels/document.xml.rels').async('string'), 'text/xml')
    const destino = {}
    for (const r of Array.from(rels.getElementsByTagName('Relationship'))) {
      destino[r.getAttribute('Id')] = { target: r.getAttribute('Target'), externo: r.getAttribute('TargetMode') === 'External' }
    }
    const body = new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagNameNS(W, 'body')[0]
    const elementos = Array.from(body.childNodes).filter(n => n.nodeType === 1 && (n.localName === 'p' || n.localName === 'tbl'))

    let grupo = null
    let nTabla = 0
    let ordenEnGrupo = 0
    const nuevoGrupo = (nombre, motivo) => {
      let id = slug(nombre)
      const existente = grupos.find(g => g.id === id)
      if (existente) { grupo = existente; ordenEnGrupo = ejercicios.filter(e => e.grupoId === id).length; return }
      grupo = { id, nombre, orden: grupos.length + 1, origen: archivo }
      grupos.push(grupo)
      ordenEnGrupo = 0
      if (motivo) inc({ documento: archivo, grupo: nombre, tipo: 'Grupo nuevo dentro del documento', detalle: motivo })
    }

    // Guarda las imágenes de una celda/párrafo y devuelve las rutas de las fotos
    const guardarFotos = async (refs, idEjercicio, nombreEj, ubicacion) => {
      const fotos = []
      for (const ref of refs) {
        const d = destino[ref.id]
        if (!d || ref.externa || d.externo) {
          inc({ documento: archivo, grupo: grupo?.nombre, ejercicio: nombreEj, ubicacion, tipo: 'Imagen enlazada (no incrustada)', detalle: `La imagen apunta a un archivo externo (${d?.target ?? ref.id}); no está dentro del Word.` })
          continue
        }
        const ruta = path.posix.join('word', d.target.replace(/^\/?word\//, '').replace(/^\//, ''))
        const f = zip.file(ruta)
        if (!f) { inc({ documento: archivo, grupo: grupo?.nombre, ejercicio: nombreEj, ubicacion, tipo: 'Imagen no encontrada', detalle: ruta }); continue }
        const bytes = await f.async('nodebuffer')
        const hash = crypto.createHash('sha1').update(bytes).digest('hex')
        const n = fotos.length + 1
        const ext = path.extname(ruta).toLowerCase()
        let rel
        try {
          let entrada = bytes
          if (ext === '.emf') entrada = emfABitmap(bytes)
          else if (ext === '.wmf') throw new Error('formato no convertible')
          rel = `fotos/${idEjercicio}_${n}.webp`
          await sharp(entrada.datos ?? entrada, entrada.raw ? { raw: entrada.raw } : undefined).rotate().resize({ width: LADO_MAX, height: LADO_MAX, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: CALIDAD_WEBP }).toFile(path.join(DATA, rel))
        } catch (e) {
          fs.mkdirSync(ORIGINALES, { recursive: true })
          const orig = `originales/${idEjercicio}_${n}${ext}`
          fs.writeFileSync(path.join(DATA, orig), bytes)
          inc({ documento: archivo, grupo: grupo?.nombre, ejercicio: nombreEj, foto: orig, ubicacion, tipo: 'Imagen no convertible', detalle: `Formato ${ext} (${e.message}). Se guarda el original en data/${orig} y NO se incluye en las fotos del ejercicio.` })
          continue
        }
        fotos.push(rel)
        if (!porHash.has(hash)) porHash.set(hash, [])
        porHash.get(hash).push({ ejercicio: nombreEj, foto: rel, documento: archivo, grupo: grupo?.nombre, ubicacion })
      }
      return fotos
    }

    const crearEjercicio = async (lineas, refs, ubicacion, fueraDeTabla) => {
      const nombre = lineas.join('\n')
      const base = `${grupo.id}-${slug(lineas.join(' '))}`
      let id = base, k = 2
      while (idsUsados.has(id)) id = `${base}-${k++}`
      idsUsados.add(id)
      const fotos = await guardarFotos(refs, id, nombre, ubicacion)
      ordenEnGrupo++
      const e = { id, nombre, grupoId: grupo.id, grupoNombre: grupo.nombre, fotos, videos: [], orden: ordenEnGrupo, origen: archivo, ubicacion }
      ejercicios.push(e)
      const clave = slug(lineas.join(' '), 500)
      if (!porNombre.has(clave)) porNombre.set(clave, [])
      porNombre.get(clave).push(e)
      if (fueraDeTabla) inc({ documento: archivo, grupo: grupo.nombre, ejercicio: nombre, ubicacion, tipo: 'Texto fuera de tabla', detalle: 'Línea suelta fuera de las tablas. Se ha importado como ejercicio sin fotos. ¿Es un ejercicio, un título o una nota?' })
      if (lineas.length >= 4 || (lineas.length >= 3 && fotos.length === 0)) inc({ documento: archivo, grupo: grupo.nombre, ejercicio: nombre, ubicacion, tipo: 'Celda con varias líneas', detalle: `La celda tiene ${lineas.length} líneas${fotos.length ? '' : ' y ninguna foto'}. Se ha importado como UN ejercicio. ¿Son varios ejercicios o variantes?` })
      if (!fueraDeTabla && fotos.length === 0) inc({ documento: archivo, grupo: grupo.nombre, ejercicio: nombre, ubicacion, tipo: 'Ejercicio sin fotos', detalle: 'La celda tiene nombre pero ninguna imagen.' })
      return e
    }

    for (let i = 0; i < elementos.length; i++) {
      const el = elementos[i]
      if (el.localName === 'p') {
        const t = textoParrafo(el)
        const refs = imagenes(el)
        if (!t && !refs.length) continue
        if (!grupo) {
          if (!t) { inc({ documento: archivo, tipo: 'Imagen antes del título', detalle: 'Hay una imagen antes del título del documento.' }); continue }
          nuevoGrupo(t)
          const nombreArchivo = archivo.replace(/^\d+\s*/, '').replace(/\.docx$/i, '').replace(/^Ejercicios\s+/i, '')
          if (slug(nombreArchivo) !== slug(t)) inc({ documento: archivo, grupo: t, tipo: 'Título distinto del nombre del archivo', detalle: `El título del Word es "${t}" y el archivo se llama "${nombreArchivo}". Se usa el título como grupo muscular.` })
          continue
        }
        // ¿Título de un grupo nuevo? Párrafo sin imágenes seguido (tras vacíos) de una tabla
        let sig = i + 1
        while (sig < elementos.length && elementos[sig].localName === 'p' && !textoParrafo(elementos[sig]) && !imagenes(elementos[sig]).length) sig++
        const vaAntesDeTabla = sig < elementos.length && elementos[sig].localName === 'tbl'
        if (t && !refs.length && vaAntesDeTabla) {
          if (slug(t) === grupo.id) continue // el mismo título repetido (p. ej. DORSAL)
          nuevoGrupo(t, `A mitad de ${archivo} aparece el título "${t}" antes de una tabla. Los ejercicios siguientes se asignan al grupo "${t}" y no a "${grupos.find(g => g.origen === archivo).nombre}".`)
          continue
        }
        if (!t && refs.length) {
          const ubic = `Fuera de tabla, tras la tabla ${nTabla}`
          const fotos = await guardarFotos(refs, `${grupo.id}-suelta-${i}`, '(imagen suelta)', ubic)
          inc({ documento: archivo, grupo: grupo.nombre, foto: fotos.join(', '), ubicacion: ubic, tipo: 'Imagen fuera de tabla', detalle: 'Imagen sin nombre de ejercicio fuera de las tablas. Se guarda pero no se asigna a ningún ejercicio.' })
          continue
        }
        await crearEjercicio([t], refs, `Fuera de tabla, tras la tabla ${nTabla}`, true)
        continue
      }
      // Tabla
      nTabla++
      if (!grupo) nuevoGrupo('(sin título)', `${archivo} no tiene título antes de la primera tabla.`)
      const filas = hijos(el, 'tr')
      let vacias = 0
      for (const [fi, fila] of filas.entries()) {
        for (const [ci, celda] of hijos(fila, 'tc').entries()) {
          const lineas = celda.getElementsByTagNameNS(W, 'p')
          const textos = Array.from(lineas).map(textoParrafo).filter(Boolean)
          const refs = imagenes(celda)
          const ubic = `Tabla ${nTabla}, fila ${fi + 1}, columna ${ci + 1}`
          if (!textos.length && !refs.length) { vacias++; continue }
          if (!textos.length) {
            const fotos = await guardarFotos(refs, `${grupo.id}-sin-nombre-t${nTabla}f${fi + 1}c${ci + 1}`, '(sin nombre)', ubic)
            inc({ documento: archivo, grupo: grupo.nombre, foto: fotos.join(', '), ubicacion: ubic, tipo: 'Celda sin nombre', detalle: `La celda tiene ${refs.length} imagen(es) pero ningún texto. Se guardan las fotos pero no se crea ejercicio.` })
            continue
          }
          await crearEjercicio(textos, refs, ubic, false)
        }
      }
      if (vacias) inc({ documento: archivo, grupo: grupo.nombre, ubicacion: `Tabla ${nTabla}`, tipo: 'Celdas vacías', detalle: `${vacias} celda(s) vacía(s) de ${filas.reduce((s, f) => s + hijos(f, 'tc').length, 0)}. Ignoradas.` })
    }
    const delDoc = ejercicios.filter(e => e.origen === archivo)
    console.log(`   ${delDoc.length} ejercicios, ${delDoc.reduce((s, e) => s + e.fotos.length, 0)} fotos`)
  }

  // Fotos repetidas (misma imagen en ejercicios distintos, o dos veces en el mismo)
  for (const usos of porHash.values()) {
    if (usos.length < 2) continue
    for (const u of usos) {
      const otros = usos.filter(o => o !== u)
      const mismo = otros.filter(o => o.ejercicio === u.ejercicio && o.documento === u.documento)
      const distintos = [...new Set(otros.filter(o => !(o.ejercicio === u.ejercicio && o.documento === u.documento)).map(o => o.documento === u.documento ? o.ejercicio.replace(/\n/g, ' / ') : `${o.ejercicio.replace(/\n/g, ' / ')} (${o.grupo})`))]
      const partes = []
      if (distintos.length) partes.push(`Misma imagen que en: ${distintos.join(', ')}`)
      if (mismo.length) partes.push('repetida dentro del mismo ejercicio')
      inc({ documento: u.documento, grupo: u.grupo, ejercicio: u.ejercicio, foto: u.foto, ubicacion: u.ubicacion, tipo: 'Foto repetida', detalle: partes.join('; ') + '.' })
    }
  }

  // Nombres repetidos
  for (const lista of porNombre.values()) {
    if (lista.length < 2) continue
    for (const e of lista) {
      const otros = lista.filter(o => o !== e).map(o => `${o.grupoNombre} (${o.ubicacion})`)
      const mismoGrupo = lista.every(o => o.grupoId === e.grupoId)
      inc({ documento: e.origen, grupo: e.grupoNombre, ejercicio: e.nombre, ubicacion: e.ubicacion, tipo: mismoGrupo ? 'Nombre repetido en el mismo grupo' : 'Nombre repetido entre grupos', detalle: `También aparece en: ${otros.join('; ')}. Se mantienen como ejercicios distintos (id ${e.id}).` })
    }
  }

  // Guardar JSON
  const ejerciciosJson = ejercicios.map(({ ubicacion, ...e }) => e)
  fs.writeFileSync(path.join(DATA, 'grupos.json'), JSON.stringify(grupos.map(({ id, nombre, orden, origen }) => ({ id, nombre, orden, origen })), null, 2))
  fs.writeFileSync(path.join(DATA, 'ejercicios.json'), JSON.stringify(ejerciciosJson, null, 2))

  // Incidencias
  const orden = ['Título distinto del nombre del archivo', 'Grupo nuevo dentro del documento', 'Texto fuera de tabla', 'Celda con varias líneas', 'Celda sin nombre', 'Imagen fuera de tabla', 'Ejercicio sin fotos', 'Imagen no convertible', 'Imagen enlazada (no incrustada)', 'Imagen no encontrada', 'Nombre repetido entre grupos', 'Nombre repetido en el mismo grupo', 'Foto repetida', 'Celdas vacías']
  const pos = t => { const i = orden.indexOf(t); return i < 0 ? 99 : i }
  incidencias.sort((a, b) => a.documento.localeCompare(b.documento, 'es', { numeric: true }) || pos(a.tipo) - pos(b.tipo) || (a.ejercicio ?? '').localeCompare(b.ejercicio ?? ''))
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('incidencias', { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = [
    { header: 'documento', key: 'documento', width: 34 },
    { header: 'grupo', key: 'grupo', width: 22 },
    { header: 'ejercicio', key: 'ejercicio', width: 45 },
    { header: 'foto', key: 'foto', width: 40 },
    { header: 'ubicación en el Word', key: 'ubicacion', width: 30 },
    { header: 'tipo', key: 'tipo', width: 30 },
    { header: 'detalle', key: 'detalle', width: 80 },
    { header: 'revisado (si/no)', key: 'revisado', width: 16 },
    { header: 'comentario del revisor', key: 'comentario', width: 40 },
  ]
  hoja.addRows(incidencias.map(i => ({ ...i, ejercicio: i.ejercicio?.replace(/\n/g, ' / ') })))
  hoja.getRow(1).font = { bold: true }
  hoja.autoFilter = { from: 'A1', to: 'I1' }
  hoja.eachRow((r, n) => { if (n > 1) r.alignment = { wrapText: true, vertical: 'top' } })
  await libro.xlsx.writeFile(path.join(DATA, 'incidencias.xlsx'))

  // Resumen
  const tipos = {}
  for (const i of incidencias) tipos[i.tipo] = (tipos[i.tipo] ?? 0) + 1
  const tamFotos = fs.readdirSync(FOTOS).reduce((s, f) => s + fs.statSync(path.join(FOTOS, f)).size, 0)
  const md = [
    '# Resumen de la extracción',
    '',
    `Generado el ${new Date().toLocaleString('es-ES')} con \`npm run extraer\`. Fotos en WebP, lado mayor ${LADO_MAX} px.`,
    '',
    '## Por grupo muscular',
    '',
    '| # | Grupo | Documento | Ejercicios | Con fotos | Sin fotos | Fotos |',
    '|---|---|---|---:|---:|---:|---:|',
    ...grupos.map(g => {
      const es = ejercicios.filter(e => e.grupoId === g.id)
      const con = es.filter(e => e.fotos.length).length
      return `| ${g.orden} | ${g.nombre} | ${g.origen} | ${es.length} | ${con} | ${es.length - con} | ${es.reduce((s, e) => s + e.fotos.length, 0)} |`
    }),
    `| | **Total** | | **${ejercicios.length}** | **${ejercicios.filter(e => e.fotos.length).length}** | **${ejercicios.filter(e => !e.fotos.length).length}** | **${ejercicios.reduce((s, e) => s + e.fotos.length, 0)}** |`,
    '',
    `Tamaño de \`data/fotos/\`: ${(tamFotos / 1024 / 1024).toFixed(1)} MB (${fs.readdirSync(FOTOS).length} archivos).`,
    '',
    '## Incidencias por tipo',
    '',
    `Detalle en \`data/incidencias.xlsx\` (${incidencias.length} filas).`,
    '',
    '| Tipo | Filas |',
    '|---|---:|',
    ...Object.entries(tipos).sort((a, b) => pos(a[0]) - pos(b[0])).map(([t, n]) => `| ${t} | ${n} |`),
    '',
  ].join('\n')
  fs.writeFileSync(path.join(DATA, 'RESUMEN.md'), md)
  console.log('\n' + md)
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
