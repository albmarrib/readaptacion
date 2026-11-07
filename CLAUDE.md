# Readaptación

App web (PWA) para entrenadores y pacientes. **Lee `ESPECIFICACION.md` antes de hacer nada**: es la fuente de verdad (reglas de negocio, modelo de datos, fases).

## Stack
React + Vite + Tailwind CSS · Firebase (Auth, Firestore UE, Storage, Functions en Node, Hosting) · GitHub. Idioma de la interfaz: español.

## Reglas
- Proyecto Firebase: `readaptacion-app`.
- Nunca guardar claves de cuenta de servicio en el repositorio ni subirlas a GitHub (añadir al `.gitignore`).
- Datos de salud: tratarlos como sensibles (RGPD). Archivos personales de pacientes, solo en bucket de la UE.
- No ejecutar `carga_firebase/subir.js` hasta adaptarlo al modelo de la especificación y confirmarlo con el usuario.
- Respetar el contenido original de los Word; las dudas (fotos repetidas, etc.) van a `incidencias.xlsx`, no se corrigen.
- Trabajar por fases (sección 10 de la especificación). Preguntar antes de cambiar el modelo de datos.
