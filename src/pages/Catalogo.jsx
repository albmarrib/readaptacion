import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { deleteObject, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { comprimirImagen, normalizar, slug } from '../lib/util'
import { centroActual, deCentro, idDeCentro } from '../lib/centro'
import Foto from '../components/Foto'
import Modal from '../components/Modal'
import { EncabezadoPagina, IconoCatalogo } from '../components/Iconos'
import { tituloGrupo } from '../lib/volumen'
import { MATERIALES, cumpleMaterial, detectarMaterial, nombreMaterial } from '../lib/material'
import FiltroMaterial from '../components/FiltroMaterial'

const POR_PAGINA = 60

// El nombre de una celda puede tener varias líneas: la primera es el título, el resto detalle
const lineas = nombre => nombre.split('\n').filter(Boolean)

// Apartados de la lista de grupos, deducidos del nombre (no se guarda nada nuevo):
// «PECTORAL ANALITICO» → Analíticos / «Pectoral»; «PECTORAL BASICOS» → Básicos / «Pectoral».
const APARTADOS = [
  { nombre: 'Analíticos', patron: /\s+anal[ií]tic[oa]s?$/i },
  { nombre: 'Básicos', patron: /\s+b[aá]sic[oa]s?$/i },
]
function agruparPorApartado(grupos) {
  const salida = []
  for (const g of grupos) {
    const ap = APARTADOS.find(a => a.patron.test(g.nombre.trim()))
    const nombre = ap?.nombre ?? 'Generales'
    const corto = tituloGrupo(ap ? g.nombre.trim().replace(ap.patron, '') : g.nombre.trim())
    let sec = salida.find(s => s.nombre === nombre)
    if (!sec) salida.push(sec = { nombre, items: [] })
    sec.items.push({ ...g, corto })
  }
  const orden = ['Generales', 'Analíticos', 'Básicos']
  return salida.sort((a, b) => orden.indexOf(a.nombre) - orden.indexOf(b.nombre))
}

export default function Catalogo() {
  const { puedeEditarCatalogo } = useAuth()
  const [grupos, setGrupos] = useState([])
  const [grupoId, setGrupoId] = useState(null)
  const [porGrupo, setPorGrupo] = useState({})       // cache: grupoId -> ejercicios
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [material, setMaterial] = useState(null)
  const [visibles, setVisibles] = useState(POR_PAGINA)
  const [detalle, setDetalle] = useState(null)
  const [editor, setEditor] = useState(null)         // { ejercicio?: ..} | null
  const [editorGrupo, setEditorGrupo] = useState(null) // { grupo?: ..} | null
  const [error, setError] = useState('')

  useEffect(() => onSnapshot(deCentro('gruposMusculares'),
    s => setGrupos(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.orden - b.orden)),
    e => setError('No se pudo cargar el catálogo: ' + e.message)), [])

  useEffect(() => { if (!grupoId && grupos.length) setGrupoId(grupos[0].id) }, [grupos, grupoId])

  const cargarGrupo = useCallback(async (gid, forzar = false) => {
    if (!forzar && porGrupo[gid]) return porGrupo[gid]
    setCargando(true)
    try {
      const s = await getDocs(deCentro('ejercicios', where('grupoId', '==', gid)))
      const lista = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.orden - b.orden)
      setPorGrupo(p => ({ ...p, [gid]: lista }))
      return lista
    } catch (e) { setError('No se pudo cargar el grupo: ' + e.message); return [] }
    finally { setCargando(false) }
  }, [porGrupo])

  useEffect(() => { if (grupoId) cargarGrupo(grupoId) }, [grupoId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setVisibles(POR_PAGINA), [grupoId, busqueda, material])

  const lista = porGrupo[grupoId] ?? []
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return lista.filter(e => (!q || normalizar(e.nombre).includes(q)) && cumpleMaterial(e, material))
  }, [lista, busqueda, material])
  const grupo = grupos.find(g => g.id === grupoId)
  const apartados = useMemo(() => agruparPorApartado(grupos), [grupos])

  // Número de ejercicios de cada grupo (consultas de recuento: no descargan los ejercicios)
  const [cuentas, setCuentas] = useState({})
  const claveGrupos = grupos.map(g => g.id).join('|')
  useEffect(() => {
    let vivo = true
    Promise.all(grupos.map(async g => [g.id, (await getCountFromServer(deCentro('ejercicios', where('grupoId', '==', g.id)))).data().count]))
      .then(l => { if (vivo) setCuentas(Object.fromEntries(l)) }).catch(() => {})
    return () => { vivo = false }
  }, [claveGrupos]) // eslint-disable-line react-hooks/exhaustive-deps
  // Al añadir o borrar ejercicios, el recuento del grupo cargado se actualiza con la lista
  useEffect(() => { if (grupoId && porGrupo[grupoId]) setCuentas(c => ({ ...c, [grupoId]: porGrupo[grupoId].length })) }, [grupoId, porGrupo])

  const alGuardar = async (gidAnterior, gidNuevo) => {
    setEditor(null); setDetalle(null)
    await Promise.all([...new Set([gidAnterior, gidNuevo].filter(Boolean))].map(g => cargarGrupo(g, true)))
    if (gidNuevo) setGrupoId(gidNuevo)
  }

  return (
    <div className="space-y-4">
      <EncabezadoPagina icono={IconoCatalogo} color="sky" titulo="Biblioteca de Ejercicios" subtitulo={grupos.length ? `${Object.values(cuentas).reduce((s, n) => s + n, 0).toLocaleString('es-ES')} ejercicios en ${grupos.length} grupos` : ''}>
        {puedeEditarCatalogo && <>
          <button className="btn-sec" onClick={() => setEditorGrupo({})}>+ Grupo</button>
          <button className="btn" onClick={() => setEditor({})} disabled={!grupos.length}>+ Ejercicio</button>
        </>}
      </EncabezadoPagina>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-5">
        {/* Ordenador: lista lateral de grupos, por apartados */}
        <nav className="tarjeta hidden self-start !p-2 md:sticky md:top-4 md:block" aria-label="Grupos musculares">
          {apartados.map(({ nombre, items }) => (
            <div key={nombre} className="mb-2 last:mb-0">
              {apartados.length > 1 && <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{nombre}</p>}
              <ul>
                {items.map(g => (
                  <li key={g.id}>
                    <button onClick={() => setGrupoId(g.id)} aria-current={g.id === grupoId ? 'true' : undefined}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${g.id === grupoId ? 'bg-teal-50 font-medium text-teal-900' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <span className="truncate">{g.corto}</span>
                      <span className={`text-xs tabular-nums ${g.id === grupoId ? 'text-teal-700' : 'text-slate-400'}`}>{cuentas[g.id] ?? ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="min-w-0 space-y-3">
          {/* Móvil: el grupo se elige con un desplegable */}
          <label className="block md:hidden">
            <span className="sr-only">Grupo muscular</span>
            <select className="input font-medium" value={grupoId ?? ''} onChange={e => setGrupoId(e.target.value)}>
              {apartados.map(({ nombre, items }) => (
                <optgroup key={nombre} label={nombre}>
                  {items.map(g => <option key={g.id} value={g.id}>{g.corto}{cuentas[g.id] != null ? ` (${cuentas[g.id]})` : ''}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="hidden items-baseline justify-between gap-3 md:flex">
            <h2 className="text-lg font-semibold text-slate-900">{grupo ? tituloGrupo(grupo.nombre) : ''}</h2>
            {puedeEditarCatalogo && grupo && <button className="text-sm font-medium text-teal-700 hover:underline" onClick={() => setEditorGrupo({ grupo })}>Editar grupo</button>}
          </div>

          <div className="flex gap-2">
            <input className="input min-w-0 flex-1" type="search" placeholder="Buscar ejercicio…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <FiltroMaterial ejercicios={lista} valor={material} onChange={setMaterial} className="w-40 sm:w-52" />
          </div>

          <div className="flex min-h-6 flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>{cargando ? 'Cargando…' : busqueda || material ? `${filtrados.length} de ${lista.length} ejercicios` : `${lista.length} ejercicios`}</span>
            {(busqueda || material) && <button className="font-medium text-teal-700 hover:underline" onClick={() => { setBusqueda(''); setMaterial(null) }}>Quitar filtros</button>}
            {puedeEditarCatalogo && grupo && <button className="font-medium text-teal-700 hover:underline md:hidden" onClick={() => setEditorGrupo({ grupo })}>Editar grupo</button>}
          </div>

          <ul className="grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
            {filtrados.slice(0, visibles).map(e => {
              const [titulo, ...resto] = lineas(e.nombre)
              return (
                <li key={e.id}>
                  <button onClick={() => setDetalle(e)} className="tarjeta flex h-full w-full items-center gap-3 !p-2.5 text-left hover:border-teal-500">
                    {e.fotos?.[0]
                      ? <Foto ruta={e.fotos[0]} className="h-14 w-[4.5rem] shrink-0 rounded-lg" />
                      : <div className="flex h-14 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] text-slate-400">sin foto</div>}
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-snug">{titulo}</div>
                      {resto.length > 0 && <div className="line-clamp-1 text-xs text-slate-500">{resto.join(' · ')}</div>}
                      <div className="mt-1 truncate text-xs text-slate-400">
                        {[e.material?.length ? e.material.map(nombreMaterial).join(' · ') : null,
                          e.fotos?.length ? `${e.fotos.length} foto${e.fotos.length === 1 ? '' : 's'}` : null,
                          e.videos?.length ? `${e.videos.length} vídeo${e.videos.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ') || 'Sin material ni fotos'}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          {!cargando && grupo && filtrados.length === 0 && <p className="tarjeta text-center text-sm text-slate-500">{lista.length ? 'Ningún ejercicio coincide con la búsqueda.' : 'Este grupo todavía no tiene ejercicios.'}</p>}
          {filtrados.length > visibles && <button className="btn-sec w-full" onClick={() => setVisibles(v => v + POR_PAGINA)}>Ver más ({filtrados.length - visibles} restantes)</button>}
        </div>
      </div>

      {detalle && (
        <Detalle ejercicio={detalle} puedeEditar={puedeEditarCatalogo} onClose={() => setDetalle(null)}
          onEditar={() => { setEditor({ ejercicio: detalle }); }} />
      )}
      {editor && (
        <EditorEjercicio ejercicio={editor.ejercicio} grupos={grupos} grupoInicial={grupoId}
          obtenerGrupo={cargarGrupo} onClose={() => setEditor(null)} onGuardado={alGuardar} />
      )}
      {editorGrupo && (
        <EditorGrupo grupo={editorGrupo.grupo} grupos={grupos} onClose={() => setEditorGrupo(null)}
          onHecho={nuevoId => { setEditorGrupo(null); if (nuevoId) setGrupoId(nuevoId); else if (editorGrupo.grupo) { setPorGrupo(p => ({ ...p, [editorGrupo.grupo.id]: undefined })); cargarGrupo(editorGrupo.grupo.id, true) } }}
          onBorrado={() => { setEditorGrupo(null); setGrupoId(null) }} />
      )}
    </div>
  )
}

function Detalle({ ejercicio, puedeEditar, onClose, onEditar }) {
  const [titulo, ...resto] = lineas(ejercicio.nombre)
  return (
    <Modal titulo={titulo} onClose={onClose}>
      <div className="space-y-4">
        {resto.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-slate-700">{resto.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        <p className="text-sm text-slate-500">{ejercicio.grupoNombre}</p>
        {ejercicio.material?.length > 0 && <p className="flex flex-wrap gap-1.5">{ejercicio.material.map(m => <span key={m} className="insignia bg-slate-100 text-slate-700">{nombreMaterial(m)}</span>)}</p>}
        {ejercicio.fotos?.length > 0
          ? <div className="grid gap-3 sm:grid-cols-2">{ejercicio.fotos.map(f => <Foto key={f} ruta={f} className="aspect-[4/3] rounded-xl" />)}</div>
          : <p className="text-sm text-slate-400">Este ejercicio no tiene fotos.</p>}
        {ejercicio.videos?.length > 0 && (
          <div>
            <h3 className="etiqueta">Vídeos</h3>
            <ul className="space-y-1">{ejercicio.videos.map(v => <li key={v}><a href={v} target="_blank" rel="noreferrer" className="break-all text-teal-700 underline">{v}</a></li>)}</ul>
          </div>
        )}
        {puedeEditar && <div className="flex justify-end pt-2"><button className="btn" onClick={onEditar}>Editar</button></div>}
      </div>
    </Modal>
  )
}

function EditorEjercicio({ ejercicio, grupos, grupoInicial, obtenerGrupo, onClose, onGuardado }) {
  const nuevo = !ejercicio
  const [nombre, setNombre] = useState(ejercicio?.nombre ?? '')
  const [grupoId, setGrupoId] = useState(ejercicio?.grupoId ?? grupoInicial ?? grupos[0]?.id)
  const [fotos, setFotos] = useState(ejercicio?.fotos ?? [])
  const [videos, setVideos] = useState(ejercicio?.videos ?? [])
  // Material: el guardado o, si no tiene, el que se deduce del nombre (se puede corregir)
  const [material, setMaterial] = useState(ejercicio?.material ?? detectarMaterial(ejercicio?.nombre))
  const [materialTocado, setMaterialTocado] = useState(!!ejercicio?.material)
  const cambiarNombre = n => { setNombre(n); if (!materialTocado) setMaterial(detectarMaterial(n)) }
  const alternarMaterial = id => { setMaterialTocado(true); setMaterial(m => (m.includes(id) ? m.filter(x => x !== id) : [...m, id])) }
  const [nuevasFotos, setNuevasFotos] = useState([])
  const [video, setVideo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const previas = useMemo(() => nuevasFotos.map(f => URL.createObjectURL(f)), [nuevasFotos])
  useEffect(() => () => previas.forEach(URL.revokeObjectURL), [previas])

  const anadirVideo = () => {
    const v = video.trim()
    if (!v) return
    if (!/^https?:\/\//i.test(v)) { setError('El enlace debe empezar por http:// o https://'); return }
    setError(''); setVideos(x => (x.includes(v) ? x : [...x, v])); setVideo('')
  }

  const guardar = async e => {
    e.preventDefault()
    if (!nombre.trim()) { setError('Escribe el nombre del ejercicio.'); return }
    setGuardando(true); setError('')
    try {
      const g = grupos.find(x => x.id === grupoId)
      // Identificador: grupo + nombre; si ya existe se le añade un número
      let id = ejercicio?.id
      if (nuevo) {
        const base = `${grupoId}-${slug(lineas(nombre).join(' '))}`
        id = base
        for (let i = 2; (await getDoc(doc(db, 'ejercicios', id))).exists(); i++) id = `${base}-${i}`
      }
      const subidas = []
      for (const [i, f] of nuevasFotos.entries()) {
        const ruta = `ejercicios/${id}/${Date.now()}-${i + 1}.webp`
        await uploadBytes(ref(storage, ruta), await comprimirImagen(f), { contentType: 'image/webp', cacheControl: 'public,max-age=31536000' })
        subidas.push(ruta)
      }
      const quitadas = (ejercicio?.fotos ?? []).filter(f => !fotos.includes(f))
      let orden = ejercicio?.orden
      if (nuevo || grupoId !== ejercicio.grupoId) {
        const destino = await obtenerGrupo(grupoId)
        orden = Math.max(0, ...destino.map(x => x.orden ?? 0)) + 1
      }
      await setDoc(doc(db, 'ejercicios', id), {
        nombre: nombre.trim(), grupoId, grupoNombre: g.nombre,
        fotos: [...fotos, ...subidas], videos, orden, material,
        origen: ejercicio?.origen ?? 'creado en la app',
        centroId: ejercicio?.centroId ?? centroActual(),
      })
      await Promise.all(quitadas.map(f => deleteObject(ref(storage, f)).catch(() => {})))
      await onGuardado(ejercicio?.grupoId, grupoId)
    } catch (err) {
      setError('No se pudo guardar: ' + err.message); setGuardando(false)
    }
  }

  const borrar = async () => {
    if (!window.confirm('¿Eliminar este ejercicio del catálogo?\n\nLas rutinas ya creadas conservan su propia copia.')) return
    setGuardando(true)
    try {
      await Promise.all((ejercicio.fotos ?? []).map(f => deleteObject(ref(storage, f)).catch(() => {})))
      await deleteDoc(doc(db, 'ejercicios', ejercicio.id))
      await onGuardado(ejercicio.grupoId, null)
    } catch (err) { setError('No se pudo eliminar: ' + err.message); setGuardando(false) }
  }

  return (
    <Modal titulo={nuevo ? 'Nuevo ejercicio' : 'Editar ejercicio'} onClose={guardando ? () => {} : onClose}>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="etiqueta" htmlFor="nombre">Nombre</label>
          <textarea id="nombre" rows={2} className="input" value={nombre} onChange={e => cambiarNombre(e.target.value)} placeholder="Ej.: Sentadilla con barra" />
          <p className="mt-1 text-xs text-slate-500">Una línea por cada variante o detalle; la primera es el título.</p>
        </div>
        <div>
          <label className="etiqueta" htmlFor="grupo">Grupo muscular</label>
          <select id="grupo" className="input" value={grupoId} onChange={e => setGrupoId(e.target.value)}>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>

        <div>
          <span className="etiqueta">Material</span>
          <div className="flex flex-wrap gap-1.5">
            {MATERIALES.map(m => (
              <button type="button" key={m.id} onClick={() => alternarMaterial(m.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${material.includes(m.id) ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400'}`}>{m.nombre}</button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">{materialTocado ? 'Puedes marcar varios.' : 'Propuesto a partir del nombre: corrígelo si hace falta. Puedes marcar varios.'}</p>
        </div>

        <div>
          <span className="etiqueta">Fotos</span>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map(f => (
              <div key={f} className="relative">
                <Foto ruta={f} className="aspect-square rounded-xl" />
                <button type="button" onClick={() => setFotos(x => x.filter(y => y !== f))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-sm text-red-700 shadow" aria-label="Quitar foto">✕</button>
              </div>
            ))}
            {previas.map((u, i) => (
              <div key={u} className="relative">
                <img src={u} alt="" className="aspect-square w-full rounded-xl bg-slate-100 object-contain" />
                <button type="button" onClick={() => setNuevasFotos(x => x.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-sm text-red-700 shadow" aria-label="Quitar foto">✕</button>
              </div>
            ))}
          </div>
          <label className="btn-sec mt-2 cursor-pointer">
            + Añadir fotos
            <input type="file" accept="image/*" multiple hidden onChange={e => { setNuevasFotos(x => [...x, ...e.target.files]); e.target.value = '' }} />
          </label>
        </div>

        <div>
          <label className="etiqueta" htmlFor="video">Vídeos (enlaces de YouTube u otros)</label>
          <div className="flex gap-2">
            <input id="video" type="url" className="input" value={video} onChange={e => setVideo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); anadirVideo() } }} placeholder="https://…" />
            <button type="button" className="btn-sec shrink-0" onClick={anadirVideo}>Añadir</button>
          </div>
          <ul className="mt-2 space-y-1">
            {videos.map(v => (
              <li key={v} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 break-all text-teal-700">{v}</span>
                <button type="button" className="text-red-700" onClick={() => setVideos(x => x.filter(y => y !== v))} aria-label="Quitar vídeo">✕</button>
              </li>
            ))}
          </ul>
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {!nuevo ? <button type="button" className="btn-peligro" onClick={borrar} disabled={guardando}>Eliminar</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-sec" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button className="btn" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function EditorGrupo({ grupo, grupos, onClose, onHecho, onBorrado }) {
  const nuevo = !grupo
  const [nombre, setNombre] = useState(grupo?.nombre ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const guardar = async e => {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) { setError('Escribe el nombre del grupo.'); return }
    setOcupado(true); setError('')
    try {
      if (nuevo) {
        const id = idDeCentro(slug(n))
        if (!id) throw new Error('El nombre no es válido.')
        if (grupos.some(g => g.id === id || slug(g.nombre) === slug(n))) throw new Error('Ya existe un grupo con ese nombre.')
        await setDoc(doc(db, 'gruposMusculares', id), { nombre: n, orden: Math.max(0, ...grupos.map(g => g.orden ?? 0)) + 1, centroId: centroActual() })
        onHecho(id)
      } else {
        await setDoc(doc(db, 'gruposMusculares', grupo.id), { nombre: n, orden: grupo.orden, centroId: grupo.centroId ?? centroActual() })
        // El nombre del grupo también está copiado en cada ejercicio
        const ejs = await getDocs(deCentro('ejercicios', where('grupoId', '==', grupo.id)))
        for (let i = 0; i < ejs.docs.length; i += 400) {
          const lote = writeBatch(db)
          ejs.docs.slice(i, i + 400).forEach(d => lote.update(d.ref, { grupoNombre: n }))
          await lote.commit()
        }
        onHecho(null)
      }
    } catch (err) { setError(err.message); setOcupado(false) }
  }

  const borrar = async () => {
    setOcupado(true); setError('')
    try {
      const hay = await getDocs(deCentro('ejercicios', where('grupoId', '==', grupo.id)))
      if (!hay.empty) throw new Error(`El grupo tiene ${hay.size} ejercicios. Muévelos o elimínalos antes de borrarlo.`)
      if (!window.confirm(`¿Eliminar el grupo «${grupo.nombre}»?`)) { setOcupado(false); return }
      await deleteDoc(doc(db, 'gruposMusculares', grupo.id))
      onBorrado()
    } catch (err) { setError(err.message); setOcupado(false) }
  }

  return (
    <Modal titulo={nuevo ? 'Nuevo grupo muscular' : 'Editar grupo muscular'} onClose={onClose} ancho="max-w-md">
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="etiqueta" htmlFor="ng">Nombre</label>
          <input id="ng" className="input" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {!nuevo ? <button type="button" className="btn-peligro" onClick={borrar} disabled={ocupado}>Eliminar</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-sec" onClick={onClose} disabled={ocupado}>Cancelar</button>
            <button className="btn" disabled={ocupado}>Guardar</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
