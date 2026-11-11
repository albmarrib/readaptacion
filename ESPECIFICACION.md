# Readaptación — Especificación v1.4

Nombre visible de la app: **Entrenamiento Personal** (cambio del 10-nov-2026; el proyecto y el código mantienen el nombre interno «readaptacion»).

Estado: acordada con el cliente (7-nov-2026). Todas las decisiones que antes se marcaban como supuesto las ha confirmado el cliente el 7-nov-2026.

Cambios respecto a la v1: una rutina tiene **varios días**, cada uno con su grupo muscular y sus ejercicios; el volumen usa notación `S*R` con **micropausas** (`+`); el peso se anota **por línea** del volumen; el esfuerzo es **la suma de series por día**.

## 1. Objetivo

Aplicación web instalable en el móvil (PWA) para entrenadores que trabajan con pacientes o personas que necesitan planes de entrenamiento personalizados (readaptación).

- El **entrenador** dispone de un catálogo extenso de ejercicios, crea rutinas para sus pacientes y hace seguimiento.
- El **paciente** ve su rutina en el móvil y anota los pesos que usa.
- En el futuro se añadirá un módulo equivalente de **nutrición**; la estructura de datos debe poder admitirlo sin rehacerse.

## 2. Roles

| Rol | Qué puede hacer |
|---|---|
| **Administrador** (entrenador jefe) | Todo lo del entrenador. Da de alta a otros entrenadores y decide si cada uno puede **editar el catálogo** o solo usarlo. |
| **Entrenador** | Gestiona sus pacientes y sus rutinas. Usa el catálogo; lo edita solo si tiene permiso. Ve y recibe avisos de sus pacientes. |
| **Paciente** | Ve su rutina activa y las anteriores (solo lectura). Anota pesos en la activa. Solo ve sus propios datos. |

Varios entrenadores, cada uno con sus pacientes. Un paciente pertenece a un entrenador. El administrador puede ver todos los pacientes del centro.

## 3. Tecnología

- Frontend: **React + Vite + Tailwind CSS**, instalable como **PWA**. Idioma: solo español.
- Backend: **Firebase**: Authentication, Firestore (región UE), Cloud Storage, Cloud Functions (Node), Hosting.
- Código en un repositorio de **GitHub**.
- Acceso del paciente: el entrenador crea la ficha con su correo; el paciente recibe un enlace de invitación y entra con enlace de acceso por correo (sin contraseña).
- Acceso de entrenadores y administrador: **Google o enlace de acceso por correo** (sin contraseñas que guardar ni olvidar; sustituye al "correo + contraseña" de la v1.2). El administrador da de alta a cada entrenador con la Cloud Function `crearEntrenador`; el primer administrador se crea con `scripts/crear-admin.js`.

## 4. Reglas de negocio

### 4.1 Catálogo de ejercicios
- Compartido por todos los entrenadores.
- Cada ejercicio pertenece a un **grupo muscular** y tiene: nombre, 0 o más fotos, 0 o más enlaces de vídeo (YouTube u otros).
- El **título de cada documento Word de origen es el grupo muscular** (ejemplos: "HALTEROFILIA Y CROSSFIT", "PECTORAL"). **Todos** los ejercicios del documento son los que el entrenador podrá elegir para ese grupo.
- Los ejercicios se buscan por grupo muscular con búsqueda rápida.

### 4.2 Volumen
Un **volumen** es la prescripción de series y repeticiones de un ejercicio. Se compone de una o más **líneas**. Cada línea se escribe `S*R`:

- `S` = número de series de esa línea (1–99).
- `R` = repeticiones de cada serie. Puede ser **un tramo** (`20`) o **varios tramos separados por `+`** (`10+8`). El `+` indica una **micropausa**: se hacen las repeticiones del primer tramo, se descansa un momento y se hacen las del siguiente. Cada tramo es un número de repeticiones (1–99) **o una abreviatura** de letras que el paciente ya conoce (hasta 8 caracteres), p. ej. `SG` (serie gigante): `2*10 1*8+4 3*SG`. Las abreviaturas no afectan al cálculo: las series totales siguen siendo la suma de las `S` (aquí 6).
- Repeticiones por serie = suma de los tramos.

Ejemplo (press de banca con mancuernas): `1*20  2*10+8  3*8+6`

| Línea | Series | Cada serie |
|---|---|---|
| `1*20` | 1 | 20 repeticiones |
| `2*10+8` | 2 | 10 repeticiones, pausa, 8 más (18) |
| `3*8+6` | 3 | 8 repeticiones, pausa, 6 más (14) |

**Series totales del volumen = suma de la `S` de todas sus líneas** (aquí 1+2+3 = **6**).

Atributos del volumen: nombre (opcional; si no se pone se muestra la notación), **sistema de entrenamiento**, líneas, **observaciones**.

- El **sistema de entrenamiento** es una familia para agrupar volúmenes. Se elige de un desplegable o se crea en el momento.
- Los volúmenes se guardan en un **catálogo reutilizable** (empieza vacío; lo llena el entrenador a medida que los crea).
- Las **observaciones** del volumen son el texto estándar. Al asignarlo a un ejercicio de una rutina, se copian y se pueden editar solo para ese caso, sin cambiar el estándar.
- Al asignar un volumen a un ejercicio se **copia** (instantánea). Si luego se modifica el del catálogo, las rutinas ya hechas no cambian.

### 4.3 Esfuerzo
- El esfuerzo es **la suma de las series de todos los ejercicios de un día** ("VOL" en las hojas actuales). Se va mostrando mientras el entrenador añade ejercicios.
- Solo cuentan **series**, no repeticiones.
- Se muestra **solo esa suma**: no hay subtotales por bloque ni total de la rutina. Como ayuda se muestran también las series de cada ejercicio.
- Límites de esfuerzo: **fuera de alcance por ahora**, previsto como mejora futura.

### 4.4 Rutina y días
Una rutina pertenece a un paciente, dentro de una **temporada**.

- **Temporada**: el año en que se aplica (ej. 2026). Un paciente puede tener varias rutinas en la misma temporada.
- **Número de rutina**: consecutivo por paciente (1, 2, 3…), automático, no se reinicia al cambiar de temporada.
- **Duración**: en semanas. **Por defecto 5**, modificable manualmente en cada rutina (rango habitual 4–6).
- **Fechas**: inicio al activar la rutina; fin = inicio + semanas.
- **Días**: el entrenador crea la rutina según los días por semana que el paciente puede ir al gimnasio (acordado antes con él). **El número de días de la rutina es el número de días por semana.** Normalmente cada día es distinto.
- **Cada día** tiene uno o varios **grupos musculares** elegidos por el entrenador y su propia lista de ejercicios. El título del día se forma con los grupos elegidos (ej. "Pectoral + Deltoides + Tríceps").
- **Ejercicios de un día**: tantos como decida el entrenador, elegidos entre los ejercicios de los grupos de ese día. Cada uno lleva su volumen.
- Un mismo ejercicio puede repetirse en días distintos; cada aparición es independiente (su volumen y sus pesos).
- **Frecuencia**: campo opcional, informativo, número de 2 dígitos máximo (0–99), puesto por el entrenador en la rutina. No se calcula.
- **Nota general** de la rutina: texto opcional.
- **Estados**: `borrador` → `activa` (visible al paciente) → `pendiente` (venció, requiere revisión) → `cerrada` (solo lectura).
- Se podrá **duplicar** una rutina para preparar la siguiente.

### 4.5 Pesos
- El paciente anota **un peso por línea del volumen** de cada ejercicio, **una vez por rutina** (no por sesión ni por día). El mismo peso vale para las series de esa línea.
  - `1*20 2*10+8 3*8+6` → 3 casillas (una por línea): 20 reps con un peso, las 2 series de 18 con otro, las 3 de 14 con otro.
- El paciente puede corregir el peso mientras la rutina esté activa. Se guarda la fecha de la última modificación.
- El entrenador ve los pesos y puede comparar la evolución con rutinas anteriores del mismo ejercicio.

### 4.6 Avisos y seguimiento
- Al vencer la duración de una rutina activa, el sistema avisa al entrenador (aviso dentro de la app + correo). La rutina pasa a `pendiente`.
- El entrenador puede: ver los pesos y su evolución, contactar al paciente por **WhatsApp** (botón que abre el chat con el teléfono del paciente), añadir **notas y comentarios**, y **cerrar** la rutina.
- Chat interno: **futuro**.

## 5. Flujos principales

**Entrenador crea una rutina**
1. Elige paciente, temporada (el número de rutina sale solo), duración y número de días.
2. Para cada día elige el grupo muscular (o grupos).
3. Añade ejercicios de esos grupos con búsqueda rápida.
4. Para cada ejercicio asigna un volumen: elige uno existente o crea uno (nombre opcional, sistema, líneas con sus tramos, observaciones). Ve las series del ejercicio y **la suma del día**.
5. Ajusta las observaciones de ese caso si hace falta, añade una nota general si quiere y activa la rutina.

**Paciente (móvil)**
Diseño libre: **no hay que replicar el formato en papel actual**; el objetivo es que se vea y se entienda lo mejor posible en el móvil. Propuesta inicial, a revisar en la fase de diseño:
- Una pestaña (o deslizar) por día, con su título.
- Una tarjeta por ejercicio con foto(s) y enlace a vídeo.
- Cada línea del volumen explicada en claro, por ejemplo "2 series · 10 repeticiones, pausa, 8 repeticiones", junto con la notación `2*10+8` y la casilla de peso.
- Botones y casillas grandes, pensados para anotar en el gimnasio.
- Observaciones visibles en cada ejercicio.

**Administrador**
Da de alta entrenadores y marca si pueden editar el catálogo.

## 6. Modelo de datos (Firestore)

**Preparada para SaaS (v1.4, 11-nov-2026).** Cada cliente es un **centro**. Todos los documentos de
`usuarios`, `pacientes`, `ejercicios`, `gruposMusculares`, `volumenes`, `sistemasEntrenamiento`,
`avisos` y `chats` llevan `centroId`; las subcolecciones de un paciente heredan el de su ficha.
Las reglas impiden ver o tocar datos de otro centro; el administrador lo es solo de su centro.
El `centroId` de una persona solo lo asigna una Cloud Function. Los documentos nuevos con nombre fijo
(grupos, sistemas) usan el id `{centroId}_{slug}`. Primer centro: **Osteorubi** (`osteorubi`), con
todos los datos existentes (`scripts/migrar-centros.cjs`). Cada centro tiene su propio catálogo;
los de Osteorubi son solo suyos. Vídeos de ejercicios: solo enlaces (YouTube, Vimeo…).
Un centro solo puede subir o borrar fotos de sus propios ejercicios. Para cargar ejercicios en otro
centro (p. ej. el **centro de demo** con una muestra de Osteorubi): `scripts/copiar-catalogo.cjs`, que copia
grupos, ejercicios con sus fotos (a carpeta propia), sistemas y volúmenes.

**Centros actuales (11-nov-2026):** **Osteorubi** (Marcos, administrador; el catálogo completo) y **KinetiQ
Entrenamiento Personal** (`kinetiq`, el del dueño de la app, para probar y hacer demos: muestra de 5 ejercicios por
grupo copiada de Osteorubi y una copia de «Paciente de prueba»).

**Superadministrador** (dueño de la app): campo `superadmin: true` en su usuario, que solo se pone a mano
(consola o script; ningún cliente puede ponérselo). Ve el panel **Centros**: lista con recuentos (entrenadores,
pacientes, ejercicios) y puede **suspender o reactivar** un centro (no el suyo). Nunca ve datos de pacientes de
otros centros. Un centro suspendido deja a toda su gente sin acceso (reglas y funciones), sin borrar nada.

**Registro de centros nuevos** (`/registro`, público): 1) la persona se identifica con Google o con enlace al
correo (correo verificado); 2) escribe el nombre del centro y el suyo y acepta condiciones + contrato de encargo.
La función `registrarCentro` crea el centro (catálogo vacío, `plan: "prueba"`, 30 días) y su perfil de
administrador, y guarda la aceptación (versión + fecha del servidor). Una cuenta con perfil no puede registrar otro
centro. Al terminar la prueba aún no se bloquea nada: eso llegará con Stripe.

Pruebas en local: `firebase emulators:start --project demo-readaptacion` (requiere Java) y
`VITE_EMULADOR=1 npx vite`. Con el emulador la app usa un proyecto "demo-" y no puede tocar los datos reales.

```
centros/{cid}                       // lo crea/cambia solo una Cloud Function o un script
  nombre, logo, estado: "activo" | "suspendido", creado
  plan: "prueba", pruebaHasta, titularUid           // centros registrados por su cuenta
  aceptacion: { version, fecha, uid, email, nombre }  // condiciones + contrato de encargo aceptados

usuarios/{uid}
  rol: "admin" | "entrenador" | "paciente"
  nombre, email, activo
  centroId
  puedeEditarCatalogo: bool          // solo entrenadores
  pacienteId?: string                // solo rol paciente

gruposMusculares/{id}               // id = slug, ej. "pectoral"
  nombre, orden

ejercicios/{id}                      // id = slug de grupo + nombre, ej. "pierna-sentadilla" (evita choques entre grupos); en pantalla solo se muestra "nombre"
  nombre, grupoId, grupoNombre
  fotos: [ruta en Storage]
  videos: [url]
  orden, origen                      // origen = documento Word de procedencia

sistemasEntrenamiento/{id}
  nombre

volumenes/{id}
  nombre?: string
  sistemaId
  lineas: [{ series: 1-99, tramos: [1-99 | "ABREV", ...] }]   // "2*10+8" = {series:2, tramos:[10,8]}; "3*SG" = {series:3, tramos:["SG"]}
  seriesTotales: number              // calculado: suma de series
  observaciones: string

pacientes/{id}
  entrenadorId
  nombre, email, telefono, uid?      // uid al aceptar la invitación
  estado: "invitado" | "activo" | "archivado"
  consentimiento: { fecha, version }
  notas
  // Datos opcionales (todos pueden quedar vacíos):
  fechaNacimiento?, sexo?, alturaCm?, pesoKg?
  ocupacion?, nivelActividad?        // sedentario / moderado / activo / deportista
  deporte?                           // deporte o actividad que practica
  lesiones?, patologias?, medicacion?  // texto libre
  antecedentesFamiliares?            // texto libre
  calidadSueno?                      // buena / regular / mala
  alcohol?                           // no / ocasional / habitual
  fumador?                           // no / exfumador / si
  objetivos?
  derivadoPor?                       // se muestra como «Referencia»
  // Retirados el 10-nov-2026 (se borran al guardar la ficha): cirugias, alergias, contactoEmergencia

pacientes/{id}/rutinas/{rid}
  numero, temporada, semanas (def. 5)
  estado, fechaInicio?, fechaFin?
  frecuencia?: 0-99
  notaGeneral?: string
  dias: [{ numero, gruposIds: [..], titulo, diaSemana? }]  // diasPorSemana = dias.length; diaSemana 1 (lunes) - 7 (domingo)
                                     // si falta, se reparte solo (3 días: lunes, miércoles, viernes)
  creadaPor

pacientes/{id}/rutinas/{rid}/ejercicios/{eid}
  dia: numero                        // día de la rutina al que pertenece
  orden
  ejercicioId, nombre, grupoId       // instantánea del catálogo
  volumenId?, volumenNombre?
  lineas: [{ series, tramos: [..] }]
  seriesTotales
  observaciones
  pesos: { "0": number, "1": number } // clave = índice de línea
  pesosActualizado: timestamp

pacientes/{id}/rutinas/{rid}/sesiones/{AAAA-MM-DD_dN}   // entrenamientos hechos (10-nov-2026)
  dia, fecha: 'AAAA-MM-DD'
  hechos: { '<idEjercicioRutina>_<línea>': true }  // series marcadas con ✓
  completada: bool, actualizado

pacientes/{id}/rutinas/{rid}/notas/{nid}
  autorId, texto, fecha

avisos/{id}
  entrenadorId, pacienteId, rutinaId
  tipo: "rutina_vencida", fecha, leido
```

- La **suma de series de un día** se calcula a partir de los ejercicios de ese día; no hace falta guardarla.
- Los pesos van en un campo `pesos` separado para que las reglas de seguridad permitan al paciente modificar **solo** ese campo.
- Nutrición (futuro): colecciones hermanas (`planesNutricion`…) con el mismo patrón paciente → temporada → plan.

## 7. Seguridad

- Reglas de Firestore y Storage deben ampliarse; **las publicadas actualmente solo cubren el catálogo** (lectura con sesión, escritura cerrada).
- Catálogo: lectura para usuarios autenticados; escritura solo administrador y entrenadores con `puedeEditarCatalogo`.
- Pacientes y rutinas: el entrenador solo accede a los suyos; el administrador, a todos.
- Paciente: lee solo su ficha y sus rutinas; escribe únicamente `pesos` y `pesosActualizado` en rutinas `activa`.
- Altas de entrenadores: solo administrador (mediante Cloud Function; el cliente nunca se asigna rol).
- Nada de claves de servicio en el repositorio.

## 8. Protección de datos (RGPD)

- Los datos de salud son categoría especial. Pacientes: consentimiento explícito guardado con fecha y versión.
- Firestore está en **región UE**. Cloud Storage por defecto está en **EE. UU.**: se usa solo para fotos genéricas del catálogo. **Cualquier archivo personal del paciente** (fotos, vídeos de técnica) irá a un **bucket adicional en la UE**.
- Prever derecho de acceso, rectificación y borrado de un paciente.
- Antes de usar la app con pacientes reales: revisión por un asesor de protección de datos (política de privacidad, contrato de encargado, registro de actividades).
- **Documentos legales públicos** (borradores, 11-nov-2026) en `/legal`: aviso legal (LSSI art. 10), privacidad (RGPD arts. 13-14), cookies (solo técnicas, LSSI art. 22.2), condiciones del servicio para centros y contrato de encargo del tratamiento (RGPD art. 28). Papeles: el **centro** es responsable de los datos de sus pacientes; el **titular** de la app es encargado. Los datos del titular están en `src/legal/titular.js` (provisionales, se muestran como «pendiente»). Al registrarse, el centro aceptará condiciones y encargo, guardando fecha y `VERSION_LEGAL`.

## 9. Carga inicial de datos

- Origen: documentos Word. **Título = grupo muscular**; una celda por ejercicio con nombre y 0..n fotos. Se extraen **todos** los ejercicios de cada Word.
- Hecho para el primer Word ("Halterofilia y Crossfit"): 17 ejercicios, 41 fotos extraídas, más un **documento de incidencias** (fotos repetidas entre ejercicios, un ejercicio posiblemente de otro grupo, tablas vacías). El contenido original se respeta; las dudas las revisa quien elaboró el Word.
- El paquete `carga_firebase` está **sin ejecutar** y debe adaptarse a este modelo (nombres de campos y colecciones) antes de usarlo.
- El resto de Word se procesa con el mismo método.

## 10. Fases

1. **Base:** proyecto React/Vite/Tailwind/Firebase, autenticación y roles, carga del catálogo, administración de entrenadores y pacientes.
2. **Rutinas:** catálogo de volúmenes y sistemas, creador de rutinas por días con búsqueda por grupo y suma de series por día.
3. **Paciente:** invitación, vista móvil (PWA) y registro de pesos.
4. **Seguimiento:** avisos de fin de rutina, comparación de pesos con rutinas anteriores, notas, WhatsApp, cierre de rutina, duplicar rutina.
5. **Futuro:** límites de esfuerzo, chat interno, notificaciones push, nutrición.

## 11. Preguntas abiertas

Ninguna por ahora.


### Resueltas (7-nov-2026)
- **Un día puede combinar varios grupos musculares.** Confirmado por el cliente (`gruposIds` es una lista).
- **Histórico:** el paciente y el entrenador ven todas las rutinas anteriores (solo lectura). Se diseñará un apartado de **evolución por paciente** (fase 4).
- **Catálogo editable:** una vez cargados los datos, el entrenador con permiso puede **crear, editar y eliminar** grupos musculares y ejercicios (fotos y vídeos incluidos). Las rutinas ya hechas no cambian, porque guardan una copia del ejercicio.
- **Supuestos:** todos confirmados por el cliente.
- **Datos del paciente:** se añaden campos extra, todos **opcionales** (ver sección 6, `pacientes`).
- **Identificador de ejercicio:** grupo + nombre (`pierna-sentadilla`). En la búsqueda dentro de un grupo solo se muestra el nombre.
- **Fotos del catálogo:** se comprimen al extraerlas (WebP, lado mayor 1200 px). Los Word originales siguen siendo la copia de seguridad; una vez subidas, las fotos extraídas pueden borrarse del ordenador.
