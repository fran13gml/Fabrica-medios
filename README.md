# Fábrica de medios

Un asistente que crea medios digitales nuevos de principio a fin: nombre,
temática y línea editorial → logo generado → secciones → fuentes RSS para
el radar → frecuencia y cantidad de autopublicación. Al confirmar, genera
un proyecto Astro completo (mismo patrón que
[CaminandoAChamartin](https://github.com/fran13gml/caminandoachamartin) y
[El Comando](https://github.com/fran13gml/el-comando)) y lo sube a un repo
de GitHub nuevo, listo para desplegar en Cloudflare Pages.

## Cómo funciona

1. **`/crear`** — asistente en 5 pasos (React, `src/components/asistente/Wizard.tsx`).
2. **Logo** — `src/lib/logo.ts` genera un SVG determinista (paleta + forma + iniciales) a partir del nombre/temática/editorial. Sin IA de imagen, sin coste.
3. **Fuentes** — `src/data/catalogo-fuentes.json`, catálogo curado por categoría, editable en el asistente.
4. **Generación** — `functions/api/generar-medio.js` construye el proyecto (`src/lib/plantillas.ts`) y lo sube a un repo nuevo vía la API de GitHub.
5. **Autopublicación total** — cada medio generado incluye su propio radar (`radar/radar.mjs`) y un script (`scripts/auto-publicar.mjs`) que redacta con Claude y publica directamente, sin revisión humana, disparado por un GitHub Action (`.github/workflows/auto-publicar.yml`) con el cron elegido en el asistente.
6. **Dashboard** (`/dashboard`, solo en `astro dev`) — cada medio generado trae su propia sala de redacción mínima: un editor WYSIWYG (TipTap) con bloques propios (Callout, ElDato, Cita) que exporta a MDX listo para `src/content/articulos/`, y un creador de cards para redes (El dato, La cita, Última hora, Las claves) que descarga PNG en los formatos de Instagram/TikTok/X/OG, siempre con el logo y la paleta del medio. Fuente: `src/lib/plantillas-dashboard.ts` (generado a partir de las plantillas fuente en el propio código de la fábrica).

## Puesta en marcha de la fábrica

Necesita sus propios secretos, en el entorno del proyecto de Cloudflare Pages:

- `GITHUB_TOKEN` — token con permiso para crear repos (`repo`) en la cuenta donde quieras que nazcan los medios nuevos.
- `DB` — binding D1 opcional para el panel (`/`), que lista los medios ya creados. Créala con `wrangler d1 create fabrica-medios-registro`, pega el `database_id` en `wrangler.toml` y aplica `schema.sql`.

Sin esos secretos el asistente sigue funcionando (logo, secciones, fuentes,
resumen), pero el paso final de creación del repo fallará hasta que
`GITHUB_TOKEN` esté configurado.

## Comandos

```bash
npm install
npm run dev       # asistente en local
npm run build     # build de producción
```
