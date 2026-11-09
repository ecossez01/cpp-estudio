# CPP Estudio

App de estudio del CPP (ASIS, Protection of Assets 2021) que funciona sin internet.
Incluye los seis tomos: Business Principles, Physical Security, Personnel,
Investigations, Crisis Management y Security Management.
Resúmenes por capítulo, fichas, tests con explicación, notas de «ojo para el examen»,
buscador y reproductor de audios. Todo el avance se guarda en el dispositivo.

Español e inglés: el botón ES / EN de la barra superior cambia toda la app con un toque
(interfaz, fichas, tests e idea central). Los resúmenes y las notas «ojo» están en español.

## En la computadora

```
npm install
npm run dev
```

Abre `http://localhost:5173/`. No necesita descargar nada: `npm install` termina al instante.

## En el iPhone (sin internet)

1. Abre la dirección publicada en Safari (GitHub Pages).
2. Compartir → **Añadir a pantalla de inicio**.
3. Abre la app desde el icono **una vez con internet**. En Ajustes debe aparecer
   «✓ Lista para usar sin conexión».
4. A partir de ahí funciona en modo avión.

La app instalada guarda su avance y sus audios aparte de Safari: añade los audios
desde la app instalada (pestaña Audios → «Añadir audios desde Archivos»).

## Añadir contenido

- Resumen de un dominio: `tools/src/<dominio>.md` (dominios en `tools/build.py`).
- Tests: `tools/quizzes/<dominio>.json`.
- Inglés: `tools/i18n/en/<dominio>.json`. `npm run build` deja en `tools/i18n/src/` los textos
  en español con las mismas claves, para traducir lo nuevo.
- Sin archivo de tests, el test de cada capítulo se arma solo con sus preguntas de repaso.
- Después: `npm run build` (requiere Python 3 con el paquete `markdown`; para dibujar
  las fórmulas, `npm install` dentro de `tools/`). Regenera `data/`, `assets.js` y `sw.js`;
  la app instalada ofrece actualizarse.
