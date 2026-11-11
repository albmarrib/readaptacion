import { Link, Navigate, useParams } from 'react-router-dom'
import { Logo } from '../components/Iconos'
import { FECHA_LEGAL, SUBENCARGADOS, TITULAR as T, VERSION_LEGAL } from '../legal/titular'

// Documentos legales públicos (sin iniciar sesión). BORRADORES basados en la normativa oficial
// (RGPD, LOPDGDD, LSSI-CE y guías de la AEPD) para que los revise un gestor o asesor.

// Dato del titular: si falta, se muestra resaltado como pendiente
const D = ({ k, txt }) => T[k]
  ? <>{T[k]}</>
  : <mark className="rounded bg-amber-100 px-1 text-amber-900">[pendiente: {txt}]</mark>

const H = ({ children }) => <h2 className="mt-7 text-lg font-semibold text-slate-900">{children}</h2>
const P = ({ children }) => <p className="mt-2 leading-relaxed">{children}</p>
const L = ({ items }) => <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>

const Identificacion = () => (
  <L items={[
    <>Titular: <D k="nombre" txt="nombre y apellidos o razón social" /></>,
    <>NIF: <D k="nif" txt="NIF" /></>,
    <>Domicilio: <D k="domicilio" txt="dirección completa" /></>,
    <>Correo electrónico: <D k="email" txt="correo de contacto" /></>,
    <>Datos registrales: <D k="registro" txt="inscripción en el Registro Mercantil, solo si es una sociedad" /></>,
  ]} />
)

const DOCUMENTOS = {
  'aviso-legal': {
    titulo: 'Aviso legal',
    base: 'Artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE).',
    cuerpo: () => <>
      <H>1. Quién es el titular</H>
      <P>En cumplimiento del artículo 10 de la LSSI-CE se informa de los datos del titular de la aplicación {T.marca}, accesible en {T.web}:</P>
      <Identificacion />
      <H>2. Objeto</H>
      <P>{T.marca} es una aplicación web para que centros y profesionales del entrenamiento preparen planes de entrenamiento y hagan su seguimiento con sus clientes o pacientes. El titular la ofrece a los centros como servicio; cada centro es responsable del uso que hace de ella con sus propios clientes.</P>
      <P>La aplicación es una herramienta de organización del entrenamiento. No es un producto sanitario, no realiza diagnósticos y no sustituye el criterio de un profesional sanitario.</P>
      <H>3. Condiciones de uso</H>
      <P>El acceso a la aplicación requiere una cuenta. Quien la usa se compromete a hacerlo de forma lícita, a no acceder a datos ajenos, a no interferir en su funcionamiento y a mantener la confidencialidad de su acceso.</P>
      <H>4. Propiedad intelectual e industrial</H>
      <P>El diseño, el código y la marca de la aplicación pertenecen al titular. El contenido que introduce cada centro (ejercicios, fotos, vídeos enlazados, rutinas y fichas) pertenece a ese centro o a sus autores, y el titular solo lo trata para prestar el servicio.</P>
      <H>5. Enlaces a otros sitios</H>
      <P>La aplicación puede contener enlaces a servicios de terceros (por ejemplo, vídeos o WhatsApp). El titular no controla esos sitios ni responde de sus contenidos ni de sus políticas.</P>
      <H>6. Responsabilidad</H>
      <P>El titular procura que la aplicación esté disponible y funcione correctamente, pero no garantiza la ausencia de interrupciones o errores. No responde del contenido que introducen los centros ni de las decisiones de entrenamiento que estos tomen.</P>
      <H>7. Ley aplicable</H>
      <P>Este aviso se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales que correspondan según la ley; si la otra parte es consumidora, a los de su domicilio.</P>
    </>,
  },

  privacidad: {
    titulo: 'Política de privacidad',
    base: 'Artículos 13 y 14 del Reglamento (UE) 2016/679 (RGPD), artículo 11 de la Ley Orgánica 3/2018 (LOPDGDD) y la «Guía para el cumplimiento del deber de informar» de la AEPD.',
    cuerpo: () => <>
      <H>1. Dos papeles distintos</H>
      <P>En {T.marca} hay dos tipos de tratamiento de datos, y en cada uno el responsable es distinto:</P>
      <L items={[
        <><b>Datos de los centros y de sus profesionales</b> (cuentas, facturación, soporte): el responsable es el titular de la aplicación. Esta política explica ese tratamiento.</>,
        <><b>Datos de los clientes o pacientes de cada centro</b> (fichas, rutinas, pesos, datos de salud, mensajes): el responsable es <b>el centro</b>, que decide para qué los usa. El titular solo los trata por su cuenta, como <b>encargado del tratamiento</b> (artículo 28 del RGPD), según el <Link className="text-teal-700 underline" to="/legal/encargo">contrato de encargo del tratamiento</Link>. Si eres paciente, para ejercer tus derechos dirígete a tu centro o a tu entrenador.</>,
      ]} />
      <H>2. Responsable del tratamiento</H>
      <Identificacion />
      {T.delegadoProteccionDatos && <P>Delegado de protección de datos: {T.delegadoProteccionDatos}</P>}
      <H>3. Qué datos tratamos y para qué</H>
      <L items={[
        <><b>Alta y gestión de la cuenta del centro y de sus profesionales:</b> nombre, correo, centro al que pertenecen, rol y, si la añaden, foto de perfil. Base jurídica: ejecución del contrato (art. 6.1.b RGPD).</>,
        <><b>Facturación y cobro de la suscripción:</b> datos del centro y de facturación. El pago lo gestiona una entidad de pago; el titular no guarda los datos completos de la tarjeta. Base jurídica: ejecución del contrato y obligaciones legales fiscales (art. 6.1.b y 6.1.c RGPD).</>,
        <><b>Atención y soporte:</b> los datos que nos des al contactar. Base jurídica: ejecución del contrato o interés legítimo en responder (art. 6.1.b y 6.1.f RGPD).</>,
        <><b>Seguridad del servicio:</b> registros técnicos de acceso y de errores. Base jurídica: interés legítimo en mantener el servicio seguro (art. 6.1.f RGPD).</>,
        <><b>Avisos sobre el servicio:</b> comunicaciones necesarias sobre la cuenta o cambios del servicio. No enviamos publicidad sin tu consentimiento previo (art. 21 LSSI-CE).</>,
      ]} />
      <P>No se toman decisiones automatizadas con efectos jurídicos ni se elaboran perfiles.</P>
      <H>4. Cuánto tiempo los guardamos</H>
      <P>Mientras la cuenta esté activa. Después, bloqueados durante los plazos de prescripción de las obligaciones legales (por ejemplo, 6 años para documentación mercantil y 4 años para la fiscal) y, pasados esos plazos, se suprimen (art. 32 LOPDGDD).</P>
      <H>5. A quién se comunican</H>
      <P>No se ceden datos a terceros salvo obligación legal (por ejemplo, Administración Tributaria). Los proveedores tecnológicos que nos ayudan a prestar el servicio acceden a los datos solo por nuestra cuenta y con contrato:</P>
      <L items={SUBENCARGADOS.map(s => <><b>{s.nombre}</b>: {s.servicio}. {s.ubicacion}</>)} />
      <H>6. Transferencias fuera del Espacio Económico Europeo</H>
      <P>La base de datos se aloja en la Unión Europea. Algunos servicios de Google (inicio de sesión y notificaciones) pueden implicar el tratamiento de datos en EE. UU. Esas transferencias se amparan en {SUBENCARGADOS[0].garantias.charAt(0).toLowerCase() + SUBENCARGADOS[0].garantias.slice(1)} (artículos 45 y 46 RGPD).</P>
      <H>7. Tus derechos</H>
      <P>Puedes pedir el acceso, la rectificación o la supresión de tus datos, la limitación del tratamiento, oponerte a él y pedir la portabilidad, así como retirar el consentimiento que hayas dado, sin que ello afecte a lo ya realizado (artículos 15 a 22 RGPD). Escribe a <D k="email" txt="correo de contacto" /> indicando qué derecho quieres ejercer.</P>
      <P>Si consideras que no se han respetado tus derechos, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (<a className="text-teal-700 underline" href="https://www.aepd.es" target="_blank" rel="noreferrer">www.aepd.es</a>).</P>
      <H>8. Seguridad</H>
      <P>Aplicamos medidas técnicas y organizativas adecuadas al riesgo (art. 32 RGPD): conexiones cifradas, acceso solo con cuenta, separación estricta de los datos de cada centro, reglas de acceso por rol y copias de seguridad.</P>
    </>,
  },

  cookies: {
    titulo: 'Política de cookies',
    base: 'Artículo 22.2 de la LSSI-CE y la «Guía sobre el uso de las cookies» de la AEPD (versión de mayo de 2024).',
    cuerpo: () => <>
      <H>1. Qué usamos</H>
      <P>{T.marca} <b>no usa cookies de publicidad, de análisis ni de terceros</b>. Solo guarda en tu dispositivo la información técnica imprescindible para que la aplicación funcione:</P>
      <L items={[
        <><b>Sesión</b> (Firebase Authentication): mantiene tu sesión iniciada. Dura hasta que cierres sesión.</>,
        <><b>Funcionamiento sin conexión</b> (service worker y caché de la aplicación): permite instalarla en el móvil y abrirla más rápido. Se actualiza con cada nueva versión.</>,
        <><b>Preferencias de la interfaz</b>: por ejemplo, si el menú está plegado, si cerraste el mensaje de bienvenida o el correo con el que pediste el enlace de acceso. Se guardan solo en tu dispositivo.</>,
        <><b>Caché de fotos del catálogo</b>: para cargarlas más rápido. Se guarda solo en tu dispositivo.</>,
      ]} />
      <H>2. ¿Por qué no te pedimos consentimiento?</H>
      <P>Porque todos estos datos son <b>estrictamente necesarios</b> para prestar el servicio que pides o guardan preferencias que tú eliges. El artículo 22.2 de la LSSI-CE y la guía de la AEPD los excluyen de la obligación de pedir consentimiento.</P>
      <P>Si en el futuro se añadiera algún elemento que sí lo necesite (por ejemplo, analítica), se pedirá tu consentimiento antes de usarlo, con la opción de rechazarlo tan fácil como aceptarlo, y se actualizará esta política.</P>
      <H>3. Cómo borrarlos</H>
      <P>Puedes borrarlos desde la configuración de tu navegador (datos de sitios) o desinstalando la aplicación. Si lo haces, tendrás que volver a iniciar sesión.</P>
      <H>4. Enlaces externos</H>
      <P>Si abres un vídeo enlazado (por ejemplo, de YouTube) o un chat de WhatsApp, se abre el sitio de ese tercero, que aplica sus propias cookies y políticas.</P>
    </>,
  },

  condiciones: {
    titulo: 'Condiciones del servicio para centros',
    base: 'Ley 7/1998 sobre condiciones generales de la contratación, artículos 23 a 29 de la LSSI-CE (contratación electrónica) y Código Civil. Contrato entre empresas o profesionales.',
    cuerpo: () => <>
      <H>1. Partes y objeto</H>
      <P>Estas condiciones regulan el uso de {T.marca} por parte de los centros y profesionales que la contratan («el centro»). El prestador es el titular identificado en el <Link className="text-teal-700 underline" to="/legal/aviso-legal">aviso legal</Link>. El servicio se dirige a profesionales; no se contrata como consumidor.</P>
      <H>2. Cómo se contrata</H>
      <P>Conforme al artículo 27 de la LSSI-CE se informa de que:</P>
      <L items={[
        'El centro se registra en la aplicación con los datos del centro y de su administrador.',
        'Antes de terminar el registro puede revisar y corregir sus datos.',
        'Al marcar la casilla de aceptación, el centro acepta estas condiciones y el contrato de encargo del tratamiento. Aceptarlas por vía electrónica tiene la misma validez que una firma (artículo 23 LSSI-CE).',
        'Se guarda la fecha y la versión aceptada. El centro puede consultar estos textos en cualquier momento en esta página.',
        'El contrato se formaliza en español.',
      ]} />
      <H>3. Periodo de prueba y precio</H>
      <P>Los centros nuevos disponen de un periodo de prueba gratuito de 30 días, sin obligación de contratar. Después, el servicio se presta mediante una suscripción periódica al precio vigente publicado en el momento de contratar (<mark className="rounded bg-amber-100 px-1 text-amber-900">[pendiente: tarifas, impuestos y periodicidad]</mark>). El pago se gestiona mediante una entidad de pago externa.</P>
      <P>Si no se renueva el pago, el acceso del centro puede quedar suspendido. Suspender no borra los datos (ver apartado 8).</P>
      <H>4. Qué incluye el servicio</H>
      <P>Acceso a la aplicación para el administrador del centro, sus entrenadores y sus pacientes; catálogo de ejercicios propio del centro; creación y seguimiento de rutinas; mensajes y avisos; alojamiento de los datos en la Unión Europea, y copias de seguridad.</P>
      <H>5. Obligaciones del centro</H>
      <L items={[
        'Dar datos veraces y mantener la confidencialidad de sus accesos.',
        'Usar la aplicación conforme a la ley, en especial la de protección de datos: el centro es responsable de los datos de sus pacientes, debe informarles y obtener su consentimiento cuando sea necesario (la aplicación ofrece al paciente un texto de consentimiento que el centro debe revisar).',
        'Tener derechos sobre el contenido que sube (fotos, textos, vídeos enlazados).',
        'Decidir los planes de entrenamiento con criterio profesional. La aplicación es una herramienta: no diagnostica ni prescribe, y no es un producto sanitario.',
      ]} />
      <H>6. Obligaciones del prestador</H>
      <L items={[
        'Prestar el servicio con diligencia y mantenerlo razonablemente disponible, salvo paradas de mantenimiento o causas ajenas.',
        'Mantener separados los datos de cada centro y aplicar medidas de seguridad adecuadas.',
        'Tratar los datos de los pacientes solo por cuenta del centro y según el contrato de encargo del tratamiento.',
        'Avisar con antelación razonable de cambios relevantes en el servicio o en estas condiciones.',
      ]} />
      <H>7. Propiedad</H>
      <P>La aplicación y su marca son del prestador. Los datos y el contenido del centro son del centro. Los ejercicios de ejemplo que el prestador pueda facilitar para empezar se ceden para su uso dentro de la aplicación.</P>
      <H>8. Baja y devolución de los datos</H>
      <P>El centro puede darse de baja cuando quiera. Al terminar el contrato, el centro puede pedir una copia de sus datos en un formato de uso común durante <mark className="rounded bg-amber-100 px-1 text-amber-900">[pendiente: plazo, p. ej. 30 días]</mark>. Pasado ese plazo, los datos se suprimen, salvo los que deban conservarse bloqueados por obligación legal.</P>
      <H>9. Suspensión por incumplimiento</H>
      <P>El prestador puede suspender el acceso de un centro si hay impago, un uso ilícito o un riesgo para la seguridad de otros centros, avisando antes cuando sea posible.</P>
      <H>10. Responsabilidad</H>
      <P>El prestador responde de los daños causados por su incumplimiento doloso o negligente. Salvo dolo o culpa grave, su responsabilidad se limita al importe pagado por el centro en los 12 meses anteriores. No responde de las decisiones de entrenamiento del centro ni del contenido que este introduce.</P>
      <H>11. Ley y jurisdicción</H>
      <P>Se aplica la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales de <mark className="rounded bg-amber-100 px-1 text-amber-900">[pendiente: ciudad]</mark>.</P>
    </>,
  },

  encargo: {
    titulo: 'Contrato de encargo del tratamiento',
    base: 'Artículo 28 del RGPD, artículo 33 de la LOPDGDD y las «Directrices para la elaboración de contratos entre responsables y encargados del tratamiento» de la AEPD.',
    cuerpo: () => <>
      <P>Este contrato forma parte de las condiciones del servicio. El centro lo acepta al registrarse, con la misma validez que una firma.</P>
      <H>1. Partes</H>
      <L items={[
        <><b>Responsable del tratamiento:</b> el centro que contrata {T.marca}, con los datos que indica al registrarse.</>,
        <><b>Encargado del tratamiento:</b> <D k="nombre" txt="nombre o razón social" />, NIF <D k="nif" txt="NIF" />, con domicilio en <D k="domicilio" txt="dirección" />.</>,
      ]} />
      <H>2. Objeto, naturaleza y finalidad</H>
      <P>El encargado trata los datos personales necesarios para prestar al centro el servicio de la aplicación: alojar y conservar los datos, permitir su consulta y modificación por las personas autorizadas del centro y por cada paciente sobre sus propios datos, enviar avisos y notificaciones, y hacer copias de seguridad. Lo hace por cuenta del centro y solo para esa finalidad.</P>
      <H>3. Duración</H>
      <P>La misma que el contrato del servicio. Al terminar, se aplica la cláusula 11.</P>
      <H>4. Datos y personas afectadas</H>
      <L items={[
        <><b>Personas:</b> pacientes o clientes del centro, y sus profesionales (administradores y entrenadores).</>,
        <><b>Datos identificativos y de contacto:</b> nombre, correo, teléfono, foto de perfil.</>,
        <><b>Datos de entrenamiento:</b> objetivos, rutinas, pesos, sesiones, esfuerzo, notas y mensajes.</>,
        <><b>Categorías especiales: datos de salud</b> (lesiones, patologías, medicación u otra información que el centro decida anotar), tratados con el consentimiento explícito del paciente que recoge el centro (art. 9.2.a RGPD).</>,
      ]} />
      <H>5. Obligaciones del encargado</H>
      <L items={[
        'Tratar los datos solo siguiendo instrucciones documentadas del centro, incluidas las de este contrato y las que el centro da al usar la aplicación. Si una instrucción le parece contraria a la ley, lo comunicará inmediatamente.',
        'No usar los datos para fines propios ni comunicarlos a terceros, salvo a los subencargados autorizados o por obligación legal.',
        'Garantizar que las personas autorizadas para tratar los datos se comprometen a mantener la confidencialidad.',
        'Aplicar las medidas de seguridad de la cláusula 7.',
        'Ayudar al centro a responder a los derechos de los pacientes (acceso, rectificación, supresión, limitación, oposición y portabilidad). Si un paciente se dirige al encargado, se lo trasladará al centro sin demora.',
        'Ayudar al centro a cumplir sus obligaciones de seguridad, notificación de brechas, evaluación de impacto y consulta previa, teniendo en cuenta la información de la que dispone.',
        'Poner a disposición del centro la información necesaria para demostrar el cumplimiento de este contrato y permitir auditorías razonables, avisando con antelación.',
        'Llevar el registro de actividades de tratamiento como encargado (art. 30.2 RGPD).',
      ]} />
      <H>6. Subencargados</H>
      <P>El centro autoriza de forma general al encargado a recurrir a estos subencargados, que asumen las mismas obligaciones de protección de datos:</P>
      <L items={SUBENCARGADOS.map(s => <><b>{s.nombre}</b>: {s.servicio}. {s.ubicacion} Garantías: {s.garantias}.</>)} />
      <P>El encargado informará al centro de cualquier cambio de subencargado con antelación, para que pueda oponerse. Si se opone por motivos razonables, podrá resolver el contrato.</P>
      <H>7. Medidas de seguridad</H>
      <L items={[
        'Datos alojados en la Unión Europea, con cifrado en tránsito y en reposo.',
        'Acceso solo con cuenta y separación estricta de los datos de cada centro mediante reglas de acceso en el servidor.',
        'Permisos por rol: el paciente solo ve sus datos; el entrenador, los de sus pacientes; el administrador, los de su centro.',
        'El prestador no consulta los datos de los pacientes salvo para dar soporte a petición del centro o por obligación legal; su panel de gestión solo muestra recuentos.',
        'Copias de seguridad y procedimientos de recuperación.',
      ]} />
      <H>8. Brechas de seguridad</H>
      <P>El encargado notificará al centro, sin dilación indebida y en un plazo máximo de 48 horas desde que tenga constancia, cualquier violación de la seguridad de los datos, con la información disponible para que el centro pueda notificarla a la AEPD en el plazo de 72 horas (art. 33 RGPD) y, si procede, a los afectados.</P>
      <H>9. Transferencias internacionales</H>
      <P>No se harán transferencias fuera del Espacio Económico Europeo salvo las de los subencargados indicados, con las garantías del capítulo V del RGPD señaladas en la cláusula 6.</P>
      <H>10. Obligaciones del centro</H>
      <L items={[
        'Informar a los pacientes y obtener su consentimiento explícito para tratar datos de salud.',
        'Entregar o introducir solo los datos necesarios para la finalidad.',
        'Responder a los derechos de los pacientes y supervisar el tratamiento.',
      ]} />
      <H>11. Fin del contrato</H>
      <P>Al terminar el servicio, y a elección del centro, el encargado le devolverá los datos en un formato de uso común y después los suprimirá, incluidas las copias, salvo que una ley exija conservarlos bloqueados. A petición del centro, certificará la supresión.</P>
    </>,
  },
}

const ORDEN = ['aviso-legal', 'privacidad', 'cookies', 'condiciones', 'encargo']

function Marco({ children }) {
  return (
    <div className="min-h-dvh bg-fondo">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/legal" className="flex items-center gap-2 font-semibold text-slate-900"><Logo tamano={28} /> {T.marca}</Link>
          <Link to="/login" className="ml-auto text-sm text-teal-700 hover:underline">Entrar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 text-[15px] text-slate-700">{children}</main>
    </div>
  )
}

export function EnlacesLegales({ className = '' }) {
  return (
    <nav className={`flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500 ${className}`}>
      {ORDEN.map(k => <Link key={k} to={`/legal/${k}`} className="hover:text-teal-700 hover:underline">{DOCUMENTOS[k].titulo.replace(' para centros', '')}</Link>)}
    </nav>
  )
}

export default function Legal() {
  const { doc } = useParams()
  if (doc && !DOCUMENTOS[doc]) return <Navigate to="/legal" replace />
  const d = DOCUMENTOS[doc]
  const borrador = VERSION_LEGAL.includes('borrador')

  return (
    <Marco>
      {borrador && (
        <p className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <b>Borrador pendiente de revisión</b> por un asesor. Los datos marcados como «pendiente» se completarán antes de comercializar el servicio.
        </p>
      )}
      {!d ? (
        <>
          <h1 className="text-2xl font-bold text-slate-900">Información legal</h1>
          <ul className="mt-4 space-y-2">
            {ORDEN.map(k => (
              <li key={k}>
                <Link to={`/legal/${k}`} className="tarjeta block !p-4 hover:border-teal-300">
                  <span className="font-medium text-slate-900">{DOCUMENTOS[k].titulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <article>
          <Link to="/legal" className="text-sm text-teal-700 hover:underline">← Información legal</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{d.titulo}</h1>
          <p className="mt-1 text-xs text-slate-500">Última actualización: {FECHA_LEGAL} · Versión {VERSION_LEGAL}</p>
          <d.cuerpo />
          <p className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-500">Base normativa: {d.base}</p>
        </article>
      )}
      <EnlacesLegales className="mt-10" />
    </Marco>
  )
}
