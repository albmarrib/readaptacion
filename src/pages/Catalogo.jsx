import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { deleteObject, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { comprimirImagen, normalizar, slug } from '../lib/util'
import { centroActual, deCentro, idDeCentro } from '../lib/centro'
import Foto from '../components/Foto'
import Modal from '../components/Modal'
import { EncabezadoPagina, IconoCatalogo } from '../components/Iconos'
import Pestanas from '../components/Pestanas'
import { tituloGrupo } from '../lib/volumen'

const POR_PAGINA = 60

// El nombre de una celda puede tener varias líneas: la primera es el título, el resto detalle
const lineas = nombre => nombre.split('\n').filter(Boolean)

export default function Catalogo() {
  const { puedeEditarCatalogo } = useAuth()
  const [grupos, setGrupos] = useState([])
  const [grupoId, setGrupoId] = useState(null)
  const [porGrupo, setPorGrupo] = useState({})       // cache: grupoId -> ejercicios
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
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
  useEffect(() => setVisibles(POR_PAGINA), [grupoId, busqueda])

  const lista = porGrupo[grupoId] ?? []
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return q ? lista.filter(e => normalizar(e.nombre).includes(q)) : lista
  }, [lista, busqueda])
  const grupo = grupos.find(g => g.id === grupoId)

  const alGuardar = async (gidAnterior, gidNuevo) => {
    setEditor(null); setDetalle(null)
    await Promise.all([...new Set([gidAnterior, gidNuevo].filter(Boolean))].map(g => cargarGrupo(g, true)))
    if (gidNuevo) setGrupoId(gidNuevo)
  }

  return (
    <div className="space-y-4">
      <EncabezadoPagina icono={IconoCatalogo} color="sky" titulo="Biblioteca de Ejercicios" subtitulo={grupo ? `${grupo.nombre} · ${lista.length} ejercicios` : ''}>
        {puedeEditarCatalogo && <>
          <button className="btn-sec" onClick={() => setEditorGrupo({})}>+ Grupo</button>
          <button className="btn" onClick={() => setEditor({})} disabled={!grupos.length}>+ Ejercicio</button>
        </>}
      </EncabezadoPagina>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Pestanas items={grupos.map(g => ({ id: g.id, etiqueta: tituloGrupo(g.nombre) }))} activo={grupoId} onChange={setGrupoId} />

      <div className="flex items-center gap-2">
        <input className="input" type="search" placeholder={`Buscar en ${grupo?.nombre ?? 'el grupo'}…`} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        {puedeEditarCatalogo && grupo && <button className="btn-sec shrink-0" onClick={() => setEditorGrupo({ grupo })}>Editar grupo</button>}
      </div>

      <p className="text-sm text-slate-500">
        {cargando ? 'Cargando…' : `${filtrados.length} ejercicio${filtrados.length === 1 ? '' : 's'}${busqueda ? ' encontrados' : ''}`}
      </p>

      <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {filtrados.slice(0, visibles).map(e => {
          const [titulo, ...resto] = lineas(e.nombre)
          return (
            <li key={e.id}>
              <button onClick={() => setDetalle(e)} className="tarjeta flex w-full items-center gap-3 !p-2.5 text-left hover:border-teal-500">
                {e.fotos?.[0]
                  ? <Foto ruta={e.fotos[0]} className="h-14 w-[4.5rem] shrink-0 rounded-lg" />
                  : <div className="flex h-14 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] text-slate-400">sin foto</div>}
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">{titulo}</div>
                  {resto.length > 0 && <div className="line-clamp-2 text-xs text-slate-500">{resto.join(' · ')}</div>}
                  <div className="mt-1 text-xs text-slate-400">{e.fotos?.length ?? 0} foto{e.fotos?.length === 1 ? '' : 's'}{e.videos?.length ? ` · ${e.videos.length} vídeo${e.videos.length === 1 ? '' : 's'}` : ''}</div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      {filtrados.length > visibles && <button className="btn-sec w-full" onClick={() => setVisibles(v => v + POR_PAGINA)}>Ver más ({filtrados.length - visibles} restantes)</button>}

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
        fotos: [...fotos, ...subidas], videos, orden,
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
          <textarea id="nombre" rows={2} className="input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: Sentadilla con barra" />
          <p className="mt-1 text-xs text-slate-500">Una línea por cada variante o detalle; la primera es el título.</p>
        </div>
        <div>
          <label className="etiqueta" htmlFor="grupo">Grupo muscular</label>
          <select id="grupo" className="input" value={grupoId} onChange={e => setGrupoId(e.target.value)}>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
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
