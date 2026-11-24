import { createContext, useCallback, useContext } from 'react'

// «Ver como paciente»: el entrenador ve las MISMAS pantallas que su paciente en el móvil, dentro de
// un marco de teléfono y en solo lectura. Este contexto dice de qué paciente se trata y bajo qué
// ruta cuelgan las pantallas (/pacientes/:id/vista-paciente/...). Fuera de la vista previa vale null.
export const VistaPacienteCtx = createContext(null)
export const useVistaPaciente = () => useContext(VistaPacienteCtx)

// Ruta de una pantalla del paciente: '/hoy' → '/pacientes/X/vista-paciente/hoy' en la vista previa
export function useRutaPaciente() {
  const vista = useVistaPaciente()
  return useCallback(ruta => (vista ? `${vista.base}${ruta}` : ruta), [vista])
}
