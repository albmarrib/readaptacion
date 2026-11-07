// Texto del consentimiento que acepta el paciente la primera vez que entra a la app.
//
// IMPORTANTE: este texto es un BORRADOR. Antes de usar la app con pacientes reales debe
// revisarlo un asesor de protección de datos (ESPECIFICACION.md, sección 8) y completarse con
// los datos del responsable del tratamiento.
//
// Prueba de lo aceptado: en la ficha se guarda { fecha (hora del servidor), version }.
// El texto exacto de cada versión es el que figura aquí en el historial de git, así que
// CADA VEZ que cambie el texto hay que cambiar VERSION (los pacientes volverán a aceptarlo).

export const VERSION_CONSENTIMIENTO = '2026-11-borrador'

export const TITULO_CONSENTIMIENTO = 'Consentimiento para el tratamiento de tus datos'

export const TEXTO_CONSENTIMIENTO = [
  {
    titulo: 'Para qué usamos tus datos',
    texto: 'Tu entrenador utiliza esta aplicación para preparar y seguir tu plan de entrenamiento personalizado: tus rutinas, los pesos que anotas y sus resultados.',
  },
  {
    titulo: 'Qué datos tratamos',
    texto: 'Tus datos de identificación y contacto (nombre, correo, teléfono), tu rutina y los pesos que registras y, si tu entrenador los anota, datos relacionados con tu salud o condición física (lesiones, patologías, medicación, objetivos…). Los datos de salud son una categoría especial y solo se tratan con tu consentimiento explícito.',
  },
  {
    titulo: 'Quién puede verlos',
    texto: 'Solo tú y tu entrenador (y el administrador del centro). No cedemos tus datos a terceros. La aplicación funciona sobre servicios de Google Firebase, que actúan como proveedor tecnológico y almacenan tus datos en la Unión Europea.',
  },
  {
    titulo: 'Cuánto tiempo los guardamos',
    texto: 'Mientras dure tu relación con tu entrenador y, después, el tiempo que exijan las obligaciones legales. Puedes pedir que los eliminemos en cualquier momento.',
  },
  {
    titulo: 'Tus derechos',
    texto: 'Puedes acceder a tus datos, rectificarlos, pedir su supresión, limitar su uso, oponerte, pedir su portabilidad y retirar este consentimiento cuando quieras, sin que ello afecte a lo ya realizado. Para ejercerlos, dirígete a tu entrenador. Si crees que tus derechos no se respetan, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).',
  },
]

export const CASILLA_CONSENTIMIENTO =
  'He leído esta información y doy mi consentimiento explícito para que se traten mis datos, incluidos los de salud, con la finalidad indicada.'

// ¿Tiene la ficha un consentimiento válido para la versión actual del texto?
export const consentimientoVigente = c => c?.version === VERSION_CONSENTIMIENTO
