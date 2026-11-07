import { firebaseConfigurado } from './lib/firebase'

export default function App() {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-3xl font-bold text-teal-700">Readaptación</h1>
        <p className="text-slate-600">Fase 1 en construcción.</p>
        {!firebaseConfigurado && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            Falta la configuración de Firebase: copia <code>.env.example</code> como <code>.env</code> y rellénalo.
          </p>
        )}
      </div>
    </main>
  )
}
