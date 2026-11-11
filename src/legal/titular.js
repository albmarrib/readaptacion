// Datos del titular de la app (quien la vende a los centros). PROVISIONALES: los rellenará el
// gestor antes de comercializar. Mientras un valor sea null, las páginas legales lo muestran
// resaltado como «pendiente».
//
// Cada vez que cambie el texto de un documento legal hay que subir VERSION_LEGAL: los centros
// guardarán qué versión aceptaron (fecha + versión), igual que el consentimiento del paciente.

export const VERSION_LEGAL = '2026-11-borrador'
export const FECHA_LEGAL = '11 de noviembre de 2026'

export const TITULAR = {
  nombre: null, // Nombre y apellidos (autónomo) o razón social (sociedad)
  nif: null, // NIF / CIF
  domicilio: null, // Dirección completa
  email: null, // Correo de contacto (también para protección de datos)
  registro: null, // Solo sociedades: datos de inscripción en el Registro Mercantil
  marca: 'Entrenamiento Personal', // Nombre comercial del servicio
  web: 'https://readaptacion-app.web.app',
  delegadoProteccionDatos: null, // Solo si se nombra un DPD (no es obligatorio en principio)
}

// Proveedores que tratan datos por cuenta del titular (subencargados)
export const SUBENCARGADOS = [
  {
    nombre: 'Google Ireland Limited (Google Cloud / Firebase)',
    servicio: 'Alojamiento de la aplicación, base de datos, inicio de sesión, funciones del servidor, archivos y notificaciones',
    ubicacion: 'Base de datos y funciones en la Unión Europea (Bélgica y región multirregional europea). El inicio de sesión y las notificaciones pueden implicar tratamiento por Google LLC en EE. UU.',
    garantias: 'Contrato de tratamiento de datos de Google Cloud (Cloud Data Processing Addendum), Marco de Privacidad de Datos UE-EE. UU. y cláusulas contractuales tipo de la Comisión Europea',
  },
]
