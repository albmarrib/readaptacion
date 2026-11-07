import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Catalogo from './pages/Catalogo'
import Pacientes from './pages/Pacientes'
import PacienteForm from './pages/PacienteForm'
import Entrenadores from './pages/Entrenadores'
import MiRutina from './pages/MiRutina'

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
      <Route element={<Protegida />}>
        <Route index element={<Inicio />} />
        <Route path="catalogo" element={<Solo cond={esPersonal}><Catalogo /></Solo>} />
        <Route path="pacientes" element={<Solo cond={esPersonal}><Pacientes /></Solo>} />
        <Route path="pacientes/nuevo" element={<Solo cond={esPersonal}><PacienteForm /></Solo>} />
        <Route path="pacientes/:id" element={<Solo cond={esPersonal}><PacienteForm /></Solo>} />
        <Route path="entrenadores" element={<Solo cond={esAdmin}><Entrenadores /></Solo>} />
        <Route path="mi-rutina" element={<Solo cond={esPaciente}><MiRutina /></Solo>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
