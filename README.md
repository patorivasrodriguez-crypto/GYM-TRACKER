# GYM TRACKER

GYM TRACKER es una aplicación web tipo PWA para registrar rutinas de gimnasio desde móvil o escritorio. Funciona offline, se instala como app y guarda toda la información en LocalStorage.

## Funcionalidades principales

- Dashboard con rutinas guardadas y botón flotante para crear nuevas sesiones.
- Rutina activa con nombre, fecha editable, notas y múltiples ejercicios.
- Registro por serie: reps, peso (kg/lbs), tempo, RIR, RPE, notas y estado completada.
- Botón `＋ Serie` que reutiliza los valores de la última serie.
- Timer de descanso automático al marcar series como completadas (con vibración si el dispositivo lo permite).
- Historial completo con detalle de sesiones y comparación de progreso de peso (↑ ↓ →).
- Biblioteca de ejercicios predefinidos + personalizados con filtro por grupo muscular.
- PWA instalable con manifest y service worker para uso offline.

## Instalación en móvil

### Android (Chrome)

1. Abre la app publicada en GitHub Pages.
2. Toca el menú de Chrome (`⋮`).
3. Selecciona **Instalar aplicación** o **Añadir a pantalla de inicio**.
4. Confirma y abre GYM TRACKER como app independiente.

### iOS (Safari)

1. Abre la app en Safari.
2. Toca el botón **Compartir**.
3. Selecciona **Añadir a pantalla de inicio**.
4. Confirma el nombre y pulsa **Añadir**.

## Uso en GitHub Pages

1. Sube los archivos al branch principal (`main`).
2. En GitHub: **Settings > Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige branch `main` y carpeta `/ (root)`.
5. Guarda cambios y abre la URL publicada por GitHub Pages.

## Estructura del proyecto

- `index.html`
- `manifest.json`
- `service-worker.js`
- `css/styles.css`
- `js/db.js`
- `js/ui.js`
- `js/app.js`
- `icons/icon.svg`
