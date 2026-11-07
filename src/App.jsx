import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Catalogo from './pages/Catalogo'
import Pacientes from './pages/Pacientes'
import PacienteForm from './pages/PacienteForm'
import Entrenadores from './pages/Entrenadores'
import MiRutina, { VistaPreviaPaciente } from './pages/MiRutina'
import RutinaEditor from './pages/RutinaEditor'
import Volumenes from './pages/Volumenes'
import Avisos from './pages/Avisos'
import Perfil from './pages/Perfil'
import Evolucion from './pages/Evolucion'
import { lazy, Suspense } from 'react'
const DemoPaciente = import.meta.env.DEV ? lazy(() => import('./dev/DemoPaciente.jsx')) : null

function Cargando() {
  return <div className="flex min-h-dvh items-center justify-center text-slate-500">Cargando…</div>
}

function Protegida() {
  const { estado } = useAuth()
  if (estado === 'cargando') return <Cargando />
  if (estado !== 'ok') return <Navigate to="/login" replace />
  return <Layout />
}

const Solo = ({ cond, children }) => (cond ? children : <Navigate to="/" replace />)

function Inicio() {
  const { esPersonal } = useAuth()
  return <Navigate to={esPersonal ? '/pacientes' : '/mi-rutina'} replace />
}

export default function App() {
  const { esAdmin, esPersonal, esPaciente } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {DemoPaciente && <Route path="/demo-paciente" element={<Suspense fallback={null}><DemoPaciente /></Suspense>} />}
      <Route element={<Protegida />}>
        <Route index element={<Inicio />} />
        <Route path="catalogo" element={<Solo cond={esPersonal}><Catalogo /></Solo>} />
        <Route path="pacientes" element={<Solo cond={esPersonal}><Pacientes /></Solo>} />
        <Route path="pacientes/nuevo" element={<Solo cond={esPersonal}><PacienteForm /></Solo>} />
        <Route path="pacientes/:id" element={<Solo cond={esPersonal}><PacienteForm /></Solo>} />
        <Route path="pacientes/:id/rutinas/nueva" element={<Solo cond={esPersonal}><RutinaEditor /></Solo>} />
        <Route path="pacientes/:id/rutinas/:rid" element={<Solo cond={esPersonal}><RutinaEditor /></Solo>} />
        <Route path="pacientes/:id/evolucion" element={<Solo cond={esPersonal}><Evolucion /></Solo>} />
        <Route path="pacientes/:id/vista-paciente" element={<Solo cond={esPersonal}><VistaPreviaPaciente /></Solo>} />
        <Route path="perfil" element={<Solo cond={esPersonal}><Perfil /></Solo>} />
        <Route path="avisos" element={<Solo cond={esPersonal}><Avisos /></Solo>} />
        <Route path="volumenes" element={<Solo cond={esPersonal}><Volumenes /></Solo>} />
        <Route path="entrenadores" element={<Solo cond={esAdmin}><Entrenadores /></Solo>} />
        <Route path="mi-rutina" element={<Solo cond={esPaciente}><MiRutina /></Solo>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
