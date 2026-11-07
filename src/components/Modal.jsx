import { useEffect } from 'react'

export default function Modal({ titulo, onClose, children, ancho = 'max-w-2xl' }) {
  useEffect(() => {
    const tecla = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`flex max-h-[92dvh] w-full ${ancho} flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
