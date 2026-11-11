// Texto del consentimiento que acepta el paciente la primera vez que entra a la app.
//
// IMPORTANTE: BORRADOR pendiente de revisión por un asesor de protección de datos
// (ESPECIFICACION.md, sección 8). Está alineado con los documentos de /legal: el CENTRO es el
// responsable de los datos del paciente y el titular de la app, su encargado del tratamiento.
//
// Prueba de lo aceptado: en la ficha se guarda { fecha (hora del servidor), version }.
// El texto exacto de cada versión es el que figura aquí en el historial de git, así que
// CADA VEZ que cambie el texto hay que cambiar VERSION (los pacientes volverán a aceptarlo).

export const VERSION_CONSENTIMIENTO = '2026-11-borrador-2'

export const TITULO_CONSENTIMIENTO = 'Consentimiento para el tratamiento de tus datos'

// centro: nombre del centro del paciente (responsable del tratamiento)
export const textoConsentimiento = centro => {
  const c = centro || 'tu centro de entrenamiento'
  return [
    {
      titulo: 'Quién es responsable de tus datos',
      texto: `${c}, el centro con el que entrenas. Es quien decide cómo se usan tus datos y a quien puedes dirigirte, a través de tu entrenador, para cualquier cuestión sobre ellos.`,
    },
    {
      titulo: 'Para qué usamos tus datos',
      texto: 'Para preparar y seguir tu plan de entrenamiento personalizado: tus rutinas, los pesos que anotas, tus sesiones y sus resultados, y para comunicarnos contigo por la app.',
    },
    {
      titulo: 'Qué datos tratamos',
      texto: 'Tus datos de identificación y contacto (nombre, correo, teléfono, foto si la añades), tu plan de entrenamiento y lo que registras, los mensajes con tu entrenador y, si tu entrenador los anota, datos relacionados con tu salud o condición física (lesiones, patologías, medicación…). Los datos de salud son una categoría especial y solo se tratan con tu consentimiento explícito.',
    },
    {
      titulo: 'Quién más interviene',
      texto: `Solo tú, tu entrenador y el administrador de ${c} pueden ver tus datos. No se ceden a terceros salvo obligación legal. La aplicación la presta un proveedor externo que guarda tus datos por cuenta del centro, sin usarlos para nada más (encargado del tratamiento), y que a su vez usa los servicios de Google Cloud / Firebase. Tus datos se guardan en la Unión Europea; el inicio de sesión y las notificaciones pueden pasar por servidores de Google en EE. UU., con las garantías legales de la UE para esas transferencias.`,
    },
    {
      titulo: 'Cuánto tiempo los guardamos',
      texto: 'Mientras sigas entrenando con el centro y, después, solo el tiempo que exijan las obligaciones legales. Puedes pedir que se eliminen en cualquier momento.',
    },
    {
      titulo: 'Tus derechos',
      texto: 'Puedes acceder a tus datos, rectificarlos, pedir su supresión, limitar su uso, oponerte, pedir su portabilidad y retirar este consentimiento cuando quieras, sin que ello afecte a lo ya realizado. Si retiras el consentimiento, no podremos seguir usando tus datos de salud. Para ejercer tus derechos, dirígete a tu entrenador o al centro. Si crees que no se respetan, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).',
    },
  ]
}

export const CASILLA_CONSENTIMIENTO =
  'He leído esta información y doy mi consentimiento explícito para que se traten mis datos, incluidos los de salud, con la finalidad indicada.'

// ¿Tiene la ficha un consentimiento válido para la versión actual del texto?
export const consentimientoVigente = c => c?.version === VERSION_CONSENTIMIENTO
