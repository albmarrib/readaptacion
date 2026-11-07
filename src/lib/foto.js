import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

// Guarda (o quita, con null) la foto de perfil propia.
// El paciente la guarda también en su ficha, para que su entrenador la vea.
export async function guardarFotoPerfil(perfil, foto) {
  const valor = foto ?? deleteField()
  await updateDoc(doc(db, 'usuarios', perfil.uid), { foto: valor })
  if (perfil.rol === 'paciente' && perfil.pacienteId) await updateDoc(doc(db, 'pacientes', perfil.pacienteId), { foto: valor })
}
