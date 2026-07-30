/**
 * Generador del proyecto Astro del medio nuevo: dado el resultado del
 * asistente, produce la lista completa de ficheros (ruta + contenido) que
 * se suben al repo recién creado. Sigue el mismo patrón que
 * CaminandoAChamartin y El Comando (Astro + Cloudflare Pages + radar +
 * autopublicación), pero parametrizado para cualquier temática.
 */
import type { Identidad } from './logo';
import { construirDashboard } from './plantillas-dashboard';

// Los campos libres del asistente (nombre, temática, editorial, secciones…)
// terminan escritos dentro de ficheros que luego se compilan o ejecutan como
// código (.ts, .astro, .mjs). Sin escapar, una comilla o un backtick del
// usuario rompe el build; un "${...}" se cuela como interpolación real
// cuando Node ejecute el .mjs generado. Cada interpolación de un campo
// libre usa uno de estos helpers según el contexto donde aterriza.

/** Para insertar como literal de cadena JS/TS (reemplaza las comillas que
 *  rodeaban la interpolación a mano: úsalo sin comillas alrededor). */
function js(valor: string): string {
  return JSON.stringify(valor);
}

/** Para insertar como texto o atributo dentro de marcado .astro/HTML que
 *  escribimos nosotros como texto plano (no pasa por el escapado en tiempo
 *  de ejecución de Astro porque no es una expresión {}). */
function html(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Para insertar como texto dentro de OTRO template literal (backticks) que
 *  forma parte del fichero generado, p. ej. el prompt de auto-publicar.mjs. */
function backtick(valor: string): string {
  return valor
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

/** Para insertar dentro de un comentario /* * / de un fichero generado: sin
 *  esto, un texto que contenga "* /" cerraría el comentario antes de tiempo
 *  y lo que viniera detrás se ejecutaría como código real. */
function comentario(valor: string): string {
  return valor.replace(/\*\//g, '*∕');
}

/** Recorta un texto libre a un máximo de caracteres, respetando palabras
 *  completas. Necesario porque el esquema de content.config.ts pone límites
 *  (p. ej. descripcion <= 200) que un campo libre del asistente puede
 *  sobrepasar sin avisar — sin esto, el build del medio revienta en cuanto
 *  la temática es un poco larga. */
function recortar(texto: string, max: number): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/** Recorta un texto libre a un eslogan corto para la cabecera, cortando en
 *  la primera frase o en un límite de caracteres por palabra completa. */
function eslogan(texto: string, max = 70): string {
  const primeraFrase = texto.split(/(?<=[.!?])\s/)[0]?.trim() ?? texto.trim();
  const base = primeraFrase.length <= max ? primeraFrase : texto.trim();
  return recortar(base, max);
}

function hashSimple(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Icono por sección: heurística de palabra clave sobre nombre+descriptor,
// con reserva genérica determinista si no encaja ninguna. Da un toque de
// personalidad al nav sin depender de IA de imagen ni assets externos.
const ICONOS_SECCION: [RegExp, string][] = [
  [/deport/i, '⚽'],
  [/m[uú]sica/i, '🎵'],
  [/cine|pel[ií]cula/i, '🎬'],
  [/tecnolog[ií]a|\btech\b/i, '💻'],
  [/ciencia/i, '🔬'],
  [/salud/i, '🩺'],
  [/gastronom|cocina|comida/i, '🍽️'],
  [/viaj/i, '✈️'],
  [/negocio|econom|finanz/i, '💼'],
  [/pol[ií]tic/i, '🏛️'],
  [/educaci|escuela|colegio/i, '🎓'],
  [/vecin|barrio|comunidad/i, '🏘️'],
  [/evento|agenda/i, '📅'],
  [/opini[oó]n/i, '🗣️'],
  [/entrevist/i, '🎙️'],
  [/libro|lectura/i, '📚'],
  [/\barte\b/i, '🎨'],
  [/moda/i, '👗'],
  [/natural|ambiente|ecolog/i, '🌿'],
  [/histori/i, '🏺'],
  [/juego|gaming|videojue/i, '🎮'],
  [/offline|desconex|silenci/i, '🌱'],
  [/club/i, '🤝'],
  [/mascota|animal/i, '🐾'],
  [/famil|niñ|infan/i, '👨‍👩‍👧'],
  [/bienestar|mindful|meditaci/i, '🧘'],
  [/empleo|trabajo|laboral/i, '💼'],
  [/cultura/i, '🎭'],
  [/actualidad|noticia/i, '📰'],
  [/plan/i, '🗓️'],
];
const ICONOS_GENERICOS = ['🧭', '📌', '🔷', '✦', '◆', '●', '▲', '■'];

function iconoSeccion(clave: string, nombre: string, descriptor: string): string {
  const texto = `${nombre} ${descriptor}`;
  for (const [patron, icono] of ICONOS_SECCION) {
    if (patron.test(texto)) return icono;
  }
  return ICONOS_GENERICOS[hashSimple(clave) % ICONOS_GENERICOS.length];
}

export interface Seccion {
  clave: string;
  nombre: string;
  descriptor: string;
}

export interface Fuente {
  nombre: string;
  url: string;
}

export interface PalabraClave {
  palabra: string;
  peso: number;
}

export interface ConfigMedio {
  nombre: string;
  slug: string;
  tematica: string;
  editorial: string;
  secciones: Seccion[];
  categoria: string;
  fuentes: Fuente[];
  frecuenciaLabel: string;
  frecuenciaCron: string;
  ventanaHoras: number;
  cantidad: number;
  palabrasClave: PalabraClave[];
  identidad: Identidad;
}

export interface Fichero {
  path: string;
  content: string;
}

/** Portada: 3 layouts distintos según cfg.identidad.layout, para que no
 *  todos los medios generados se vean con la misma composición. */
function paginaPortada(cfg: ConfigMedio): string {
  const frontmatter = `---
import Base from '../layouts/Base.astro';
import { getCollection } from 'astro:content';
import { SECCIONES } from '../content.config';

const articulos = (await getCollection('articulos', ({ data }) => !data.borrador))
  .sort((a, b) => b.data.fecha.valueOf() - a.data.fecha.valueOf());
---`;

  const vacio = `{articulos.length === 0 && <p>Todavía no hay artículos publicados. El radar y la autopublicación están en marcha.</p>}`;

  if (cfg.identidad.layout === 'hero') {
    return `${frontmatter}
<Base titulo="${html(cfg.nombre)}" descripcion="${html(cfg.tematica)}" ancho="panorama">
  <section class="portada">
    ${vacio}
    {articulos[0] && (
      <a class="hero" href={\`/\${articulos[0].data.seccion}/\${articulos[0].id}/\`}>
        <span class="seccion-tag">{SECCIONES[articulos[0].data.seccion].nombre}</span>
        <h1>{articulos[0].data.titulo}</h1>
        <p>{articulos[0].data.descripcion}</p>
      </a>
    )}
    <ul class="rejilla">
      {articulos.slice(1).map((a, i) => (
        <li style={\`animation-delay: \${Math.min(i * 60, 480)}ms\`}>
          <a href={\`/\${a.data.seccion}/\${a.id}/\`}>
            <span class="seccion-tag">{SECCIONES[a.data.seccion].nombre}</span>
            <h2>{a.data.titulo}</h2>
            <p>{a.data.descripcion}</p>
          </a>
        </li>
      ))}
    </ul>
  </section>
</Base>
<style>
  .hero {
    display: block; text-decoration: none; color: var(--tinta);
    background: linear-gradient(155deg, color-mix(in srgb, var(--primario) 22%, var(--panel)), var(--panel));
    border-radius: var(--radio); box-shadow: var(--sombra); padding: 2.6rem 2.2rem; margin-bottom: 1.6rem;
    animation: aparecer 0.5s ease both; transition: transform 0.2s ease;
  }
  .hero:hover { transform: translateY(-3px); }
  .hero h1 { font-size: clamp(1.6rem, 4vw, 2.6rem); margin: 0.5rem 0; max-width: 42rem; }
  .hero p { font-size: 1.05rem; color: var(--tinta-suave); max-width: 40rem; margin: 0; }
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.2rem; list-style: none; margin: 0; padding: 0; }
  .rejilla li { background: var(--panel); border-radius: var(--radio); box-shadow: var(--sombra); overflow: hidden; animation: aparecer 0.5s ease both; transition: transform 0.2s ease; }
  .rejilla li:hover { transform: translateY(-4px); }
  .rejilla a { display: block; padding: 1.2rem; text-decoration: none; color: var(--tinta); }
  .seccion-tag { font-family: var(--ui); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primario); font-weight: 700; }
  .rejilla h2 { font-size: 1.1rem; margin: 0.4rem 0; }
  .rejilla p { font-size: 0.88rem; color: var(--tinta-suave); margin: 0; }
</style>
`;
  }

  if (cfg.identidad.layout === 'lista') {
    return `${frontmatter}
<Base titulo="${html(cfg.nombre)}" descripcion="${html(cfg.tematica)}" ancho="lectura">
  <section class="portada">
    ${vacio}
    <ul class="lista-editorial">
      {articulos.map((a, i) => (
        <li style={\`animation-delay: \${Math.min(i * 50, 400)}ms\`}>
          <a href={\`/\${a.data.seccion}/\${a.id}/\`}>
            <span class="fecha">{a.data.fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            <span class="cuerpo">
              <span class="seccion-tag">{SECCIONES[a.data.seccion].nombre}</span>
              <h2>{a.data.titulo}</h2>
              <p>{a.data.descripcion}</p>
            </span>
          </a>
        </li>
      ))}
    </ul>
  </section>
</Base>
<style>
  .lista-editorial { list-style: none; margin: 1rem 0 0; padding: 0; }
  .lista-editorial li { border-bottom: 1px solid var(--regla); animation: aparecer 0.5s ease both; }
  .lista-editorial a { display: flex; gap: 1.2rem; padding: 1.3rem 0; text-decoration: none; color: var(--tinta); }
  .lista-editorial a:hover .seccion-tag { color: var(--acento); }
  .fecha { flex-shrink: 0; width: 3.4rem; font-family: var(--mono); font-size: 0.76rem; color: var(--tinta-suave); padding-top: 0.2rem; text-transform: uppercase; }
  .seccion-tag { font-family: var(--ui); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primario); font-weight: 700; }
  .lista-editorial h2 { font-size: 1.15rem; margin: 0.3rem 0 0.2rem; }
  .lista-editorial p { font-size: 0.92rem; color: var(--tinta-suave); margin: 0; }
</style>
`;
  }

  // rejilla (por defecto)
  return `${frontmatter}
<Base titulo="${html(cfg.nombre)}" descripcion="${html(cfg.tematica)}" ancho="panorama">
  <section class="portada">
    ${vacio}
    <ul class="rejilla">
      {articulos.map((a, i) => (
        <li style={\`animation-delay: \${Math.min(i * 60, 480)}ms\`}>
          <a href={\`/\${a.data.seccion}/\${a.id}/\`}>
            <span class="seccion-tag">{SECCIONES[a.data.seccion].nombre}</span>
            <h2>{a.data.titulo}</h2>
            <p>{a.data.descripcion}</p>
          </a>
        </li>
      ))}
    </ul>
  </section>
</Base>
<style>
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.2rem; list-style: none; margin: 0; padding: 0; }
  .rejilla li { background: var(--panel); border-radius: var(--radio); box-shadow: var(--sombra); overflow: hidden; animation: aparecer 0.5s ease both; transition: transform 0.2s ease; }
  .rejilla li:hover { transform: translateY(-4px); }
  .rejilla a { display: block; padding: 1.2rem; text-decoration: none; color: var(--tinta); }
  .seccion-tag { font-family: var(--ui); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primario); font-weight: 700; }
  .rejilla h2 { font-size: 1.15rem; margin: 0.4rem 0; }
  .rejilla p { font-size: 0.9rem; color: var(--tinta-suave); margin: 0; }
</style>
`;
}

export function construirProyecto(cfg: ConfigMedio): Fichero[] {
  const { identidad } = cfg;
  const seccionesKeys = cfg.secciones.map((s) => s.clave);
  const primeraSeccion = seccionesKeys[0] ?? 'hoy';

  const ficheros: Fichero[] = [];
  const add = (path: string, content: string) => ficheros.push({ path, content });

  // ── raíz ──────────────────────────────────────────────
  add(
    'package.json',
    JSON.stringify(
      {
        name: cfg.slug,
        type: 'module',
        version: '0.1.0',
        description: `${cfg.nombre} — generado por Fábrica de medios.`,
        scripts: {
          dev: 'astro dev',
          build: 'astro build',
          preview: 'astro preview',
          radar: 'node radar/radar.mjs --md',
          'auto-publicar': 'node scripts/auto-publicar.mjs',
        },
        dependencies: {
          '@astrojs/mdx': '^4.0.0',
          '@astrojs/react': '^4.0.0',
          '@astrojs/rss': '^4.0.0',
          '@tiptap/core': '^2.0.0',
          '@tiptap/extension-image': '^2.0.0',
          '@tiptap/extension-placeholder': '^2.0.0',
          '@tiptap/extension-table': '^2.0.0',
          '@tiptap/extension-table-row': '^2.0.0',
          '@tiptap/extension-table-cell': '^2.0.0',
          '@tiptap/extension-table-header': '^2.0.0',
          '@tiptap/pm': '^2.0.0',
          '@tiptap/react': '^2.0.0',
          '@tiptap/starter-kit': '^2.0.0',
          astro: '^5.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
        devDependencies: {
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          typescript: '^5.0.0',
        },
      },
      null,
      2
    ) + '\n'
  );

  add(
    'astro.config.mjs',
    `// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [mdx(), react()],
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
});
`
  );

  add(
    'tsconfig.json',
    JSON.stringify(
      {
        extends: 'astro/tsconfigs/base',
        compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'react' },
      },
      null,
      2
    ) + '\n'
  );

  add(
    'wrangler.toml',
    `name = "${cfg.slug}"
compatibility_date = "2025-01-01"
pages_build_output_dir = "./dist"
`
  );

  add('.gitignore', 'node_modules/\ndist/\n.astro/\n.wrangler/\n');

  add(
    'README.md',
    `# ${cfg.nombre}

${cfg.editorial}

Generado por [Fábrica de medios](https://github.com/fran13gml/fabrica-medios).

## Temática

${cfg.tematica}

## Secciones

| Key | Nombre | Descriptor |
|-----|--------|------------|
${cfg.secciones.map((s) => `| \`${s.clave}\` | ${s.nombre} | ${s.descriptor} |`).join('\n')}

## Automatización

- **Radar** (\`radar/radar.mjs\`) escanea ${cfg.fuentes.length} fuentes de la categoría *${cfg.categoria}* cada vez que corre.
- **Autopublicación** (\`.github/workflows/auto-publicar.yml\`): ${cfg.frecuenciaLabel}, redacta y publica hasta ${cfg.cantidad} artículo(s) por tanda con Claude, sin revisión humana.

### Puesta en marcha

1. Añade el secreto \`ANTHROPIC_API_KEY\` en Settings → Secrets → Actions de este repo.
2. Conecta este repo a un proyecto de Cloudflare Pages (build: \`npm run build\`, output: \`dist\`).
3. El workflow de autopublicación empezará a commitear artículos nuevos en cada disparo; Cloudflare Pages los despliega automáticamente con cada push.

## Comandos

\`\`\`bash
npm run dev             # servidor local
npm run build           # build de producción
npm run radar           # radar en terminal
npm run auto-publicar   # ejecuta una tanda de autopublicación a mano
\`\`\`
`
  );

  // ── identidad visual ──────────────────────────────────
  add('src/assets/logo.svg', identidad.svg);
  add('public/favicon.svg', identidad.svg);

  // ── content collections ───────────────────────────────
  add(
    'src/content.config.ts',
    `import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const SECCIONES = {
${cfg.secciones
  .map(
    (s) =>
      `  ${js(s.clave)}: { nombre: ${js(s.nombre)}, descriptor: ${js(s.descriptor)}, icono: ${js(
        iconoSeccion(s.clave, s.nombre, s.descriptor)
      )} },`
  )
  .join('\n')}
} as const;

export type SeccionId = keyof typeof SECCIONES;

const articulos = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articulos' }),
  schema: z.object({
    titulo: z.string().max(110),
    descripcion: z.string().max(200),
    seccion: z.enum([${cfg.secciones.map((s) => `'${s.clave}'`).join(', ')}]),
    fecha: z.coerce.date(),
    autor: z.string().default(${js(cfg.nombre)}),
    fuente: z.string().optional(),
    borrador: z.boolean().default(false),
    etiquetas: z.array(z.string()).default([]),
    imagen: z.string().optional(),
    imagenCredito: z.string().optional(),
  }),
});

export const collections = { articulos };
`
  );

  // ── layout base ───────────────────────────────────────
  add(
    'src/layouts/Base.astro',
    `---
import Header from '../components/Header.astro';

interface Props {
  titulo: string;
  descripcion: string;
  ancho?: 'lectura' | 'panorama';
  imagen?: string;
}

const { titulo, descripcion, ancho = 'lectura', imagen } = Astro.props;
const tituloCompleto = titulo === ${js(cfg.nombre)} ? ${js(cfg.nombre)} : \`\${titulo} · ${backtick(cfg.nombre)}\`;
const ogImageUrl = imagen && !imagen.startsWith('/src/') ? new URL(imagen, Astro.site ?? Astro.url).href : undefined;
---
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{tituloCompleto}</title>
    <meta name="description" content={descripcion} />
    <link rel="canonical" href={Astro.url} />
    <link rel="alternate" type="application/rss+xml" title="${html(cfg.nombre)}" href="/rss.xml" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={tituloCompleto} />
    <meta property="og:description" content={descripcion} />
    <meta property="og:site_name" content="${html(cfg.nombre)}" />
    {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
  </head>
  <body>
    <Header />
    <main class:list={[ancho]}>
      <slot />
    </main>
    <footer class="pie">
      <p>${html(cfg.nombre)} — generado y mantenido por Fábrica de medios.</p>
      <p class="pie-meta"><a href="/rss.xml">RSS</a></p>
    </footer>
  </body>
</html>

<style is:global>
  :root {
    --primario: ${cfg.identidad.paleta.primario};
    --primario-oscuro: ${cfg.identidad.paleta.primarioOscuro};
    --acento: ${cfg.identidad.paleta.acento};
    --fondo: ${cfg.identidad.paleta.fondo};
    --panel: ${cfg.identidad.paleta.panel};
    --tinta: ${cfg.identidad.paleta.tinta};
    --tinta-suave: color-mix(in srgb, var(--tinta) 65%, transparent);
    --regla: color-mix(in srgb, var(--tinta) 12%, transparent);
    --radio: 14px;
    --sombra: 0 20px 40px -18px rgba(0, 0, 0, 0.6);
    --ui: ${cfg.identidad.tipografia.ui};
    --texto: ${cfg.identidad.tipografia.texto};
    --display: ${cfg.identidad.tipografia.display};
    --tracking-titulos: ${cfg.identidad.tipografia.tracking};
    --transform-titulos: ${cfg.identidad.tipografia.transformTitulos};
    --mono: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background:
      radial-gradient(60rem 34rem at 100% -10%, color-mix(in srgb, var(--primario) 16%, transparent), transparent 60%),
      radial-gradient(50rem 30rem at -10% 100%, color-mix(in srgb, var(--acento) 12%, transparent), transparent 60%),
      var(--fondo);
    background-attachment: fixed;
    color: var(--tinta);
    font-family: var(--texto);
    line-height: 1.65;
  }

  main { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
  main.panorama { max-width: 78rem; }

  a { color: inherit; }
  a:focus-visible { outline: 2px solid var(--primario); outline-offset: 2px; }
  h1, h2, h3 { font-family: var(--display); line-height: 1.2; letter-spacing: var(--tracking-titulos); text-transform: var(--transform-titulos); }
  code { font-family: var(--mono); }
  pre { background: var(--panel); color: var(--tinta); padding: 1rem 1.2rem; overflow-x: auto; border-left: 3px solid var(--primario); border-radius: var(--radio); }

  @keyframes aparecer {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }

  .pie {
    border-top: 1px solid var(--regla);
    margin-top: 3rem;
    padding: 1.5rem;
    font-family: var(--ui);
    font-size: 0.85rem;
    color: var(--tinta-suave);
    text-align: center;
  }
  .pie-meta a { color: inherit; }
</style>
`
  );

  add(
    'src/components/Header.astro',
    `---
import { SECCIONES } from '../content.config';

const secciones = Object.entries(SECCIONES);
const pathname = Astro.url.pathname;
const esActiva = (clave: string) => pathname.startsWith(\`/\${clave}/\`);
---
<header class="hdr">
  <a href="/" class="marca" aria-label="${html(cfg.nombre)} — portada">
    <img src="/favicon.svg" alt="" class="marca-logo" width="28" height="28" />
    <span class="marca-textos">
      <span class="marca-nombre">${html(cfg.nombre)}</span>
      <span class="marca-lema">${html(eslogan(cfg.tematica))}</span>
    </span>
  </a>
  <nav class="nav" aria-label="Secciones">
    <ul>
      {secciones.map(([clave, s]) => (
        <li>
          <a href={\`/\${clave}/\`} class:list={['seccion', { activa: esActiva(clave) }]} aria-current={esActiva(clave) ? 'page' : undefined}>
            <span class="seccion-icono" aria-hidden="true">{s.icono}</span>
            <span class="seccion-nombre">{s.nombre}</span>
          </a>
        </li>
      ))}
    </ul>
  </nav>
</header>

<style>
  .hdr {
    position: sticky; top: 0; z-index: 50;
    background: var(--panel);
    border-bottom: 2px solid var(--primario);
    font-family: var(--ui);
    display: flex; flex-wrap: wrap; align-items: center; gap: 1rem;
    padding: 0.7rem 1.2rem;
  }
  .marca { display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; color: var(--tinta); }
  .marca-logo { border-radius: 6px; flex-shrink: 0; }
  .marca-textos { display: flex; flex-direction: column; line-height: 1.2; }
  .marca-nombre { font-weight: 800; font-size: 1.05rem; }
  .marca-lema { font-size: 0.72rem; color: var(--tinta-suave); font-weight: 400; }
  .nav ul { display: flex; gap: 4px; margin: 0; padding: 0; list-style: none; overflow-x: auto; }
  .seccion { display: inline-flex; align-items: baseline; gap: 0.35rem; padding: 0.5rem 0.6rem; text-decoration: none; border-bottom: 2px solid transparent; white-space: nowrap; }
  .seccion-icono { font-size: 0.85em; }
  .seccion-nombre { color: var(--tinta); font-size: 0.84rem; font-weight: 700; text-transform: lowercase; }
  .seccion:hover .seccion-nombre, .seccion.activa .seccion-nombre { color: var(--primario); }
  .seccion.activa { border-bottom-color: var(--primario); }
</style>
`
  );

  // ── componentes de artículo (genéricos) ──────────────
  add(
    'src/components/articulo/Callout.astro',
    `---
interface Props { tipo?: 'lectura' | 'contexto' };
const { tipo = 'contexto' } = Astro.props;
---
<aside class:list={['callout', tipo]}>
  <slot />
</aside>
<style>
  .callout { border-left: 3px solid var(--primario); background: var(--panel); border-radius: 0 var(--radio) var(--radio) 0; padding: 1rem 1.2rem; margin: 1.5rem 0; font-family: var(--ui); font-size: 0.95rem; }
  .callout.lectura { border-left-color: var(--acento); }
</style>
`
  );

  add(
    'src/components/articulo/ElDato.astro',
    `---
interface Props { cifra: string; unidad?: string; fuente?: string };
const { cifra, unidad, fuente } = Astro.props;
---
<figure class="el-dato">
  <p class="cifra">{cifra}{unidad && <span class="unidad">{unidad}</span>}</p>
  <figcaption><slot />{fuente && <cite> — {fuente}</cite>}</figcaption>
</figure>
<style>
  .el-dato { margin: 1.5rem 0; padding: 1rem 1.2rem; background: var(--panel); border-radius: var(--radio); }
  .cifra { font-family: var(--ui); font-size: 2.2rem; font-weight: 800; color: var(--primario); margin: 0; }
  .unidad { font-size: 1.1rem; font-weight: 600; margin-left: 0.3rem; color: var(--tinta-suave); }
  figcaption { font-size: 0.85rem; color: var(--tinta-suave); }
</style>
`
  );

  add(
    'src/components/articulo/Cita.astro',
    `---
interface Props { autor?: string; cargo?: string };
const { autor, cargo } = Astro.props;
---
<blockquote class="cita">
  <p><slot /></p>
  {autor && <footer>— {autor}{cargo && <span>, {cargo}</span>}</footer>}
</blockquote>
<style>
  .cita { border-left: 3px solid var(--acento); margin: 1.5rem 0; padding: 0.2rem 1.2rem; font-style: italic; }
  .cita footer { font-style: normal; font-size: 0.85rem; color: var(--tinta-suave); margin-top: 0.4rem; }
</style>
`
  );

  add(
    'src/components/articulo/Figura.astro',
    `---
interface Props { src: string; alt: string; pie?: string };
const { src, alt, pie } = Astro.props;
---
<figure class="figura">
  <img src={src} alt={alt} loading="lazy" />
  {pie && <figcaption>{pie}</figcaption>}
</figure>
<style>
  .figura { margin: 1.5rem 0; }
  .figura img { width: 100%; height: auto; border-radius: var(--radio); display: block; }
  .figura figcaption { font-size: 0.8rem; color: var(--tinta-suave); margin-top: 0.5rem; text-align: center; }
</style>
`
  );

  // ── páginas ───────────────────────────────────────────
  add('src/pages/index.astro', paginaPortada(cfg));

  add(
    'src/pages/[seccion]/index.astro',
    `---
import Base from '../../layouts/Base.astro';
import { getCollection } from 'astro:content';
import { SECCIONES } from '../../content.config';

export async function getStaticPaths() {
  return Object.keys(SECCIONES).map((seccion) => ({ params: { seccion } }));
}

const { seccion } = Astro.params as { seccion: keyof typeof SECCIONES };
const info = SECCIONES[seccion];
const articulos = (await getCollection('articulos', ({ data }) => !data.borrador && data.seccion === seccion))
  .sort((a, b) => b.data.fecha.valueOf() - a.data.fecha.valueOf());
---
<Base titulo={info.nombre} descripcion={info.descriptor} ancho="panorama">
  <h1><span aria-hidden="true">{info.icono}</span> {info.nombre} <small>— {info.descriptor}</small></h1>
  <ul class="lista">
    {articulos.map((a, i) => (
      <li style={\`animation-delay: \${Math.min(i * 50, 400)}ms\`}><a href={\`/\${seccion}/\${a.id}/\`}>{a.data.titulo}</a><p>{a.data.descripcion}</p></li>
    ))}
  </ul>
  {articulos.length === 0 && <p>Sin artículos todavía en esta sección.</p>}
</Base>
<style>
  .lista { list-style: none; margin: 1.5rem 0; padding: 0; }
  .lista li { padding: 1rem 0; border-bottom: 1px solid var(--regla); animation: aparecer 0.5s ease both; }
  .lista a { text-decoration: none; font-weight: 700; }
  .lista p { margin: 0.3rem 0 0; color: var(--tinta-suave); font-size: 0.9rem; }
</style>
`
  );

  add(
    'src/pages/[seccion]/[...slug].astro',
    `---
import Base from '../../layouts/Base.astro';
import { getCollection, render } from 'astro:content';
import Callout from '../../components/articulo/Callout.astro';
import Cita from '../../components/articulo/Cita.astro';
import ElDato from '../../components/articulo/ElDato.astro';
import Figura from '../../components/articulo/Figura.astro';

export async function getStaticPaths() {
  const articulos = await getCollection('articulos', ({ data }) => !data.borrador);
  return articulos.map((a) => ({ params: { seccion: a.data.seccion, slug: a.id }, props: { a } }));
}

const { a } = Astro.props as any;
const { Content } = await render(a);
---
<Base titulo={a.data.titulo} descripcion={a.data.descripcion} imagen={a.data.imagen}>
  <article>
    <p class="seccion-tag">{a.data.seccion}</p>
    <h1>{a.data.titulo}</h1>
    <p class="meta">{a.data.fecha.toLocaleDateString('es-ES')}{a.data.fuente && <> · Fuente: {a.data.fuente}</>}</p>
    <Content components={{ Callout, Cita, ElDato, Figura }} />
  </article>
</Base>
<style>
  .seccion-tag { font-family: var(--ui); font-size: 0.75rem; text-transform: uppercase; color: var(--primario); font-weight: 700; margin: 0; }
  .meta { color: var(--tinta-suave); font-size: 0.85rem; }
</style>
`
  );

  add(
    'src/pages/rss.xml.js',
    `import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const articulos = await getCollection('articulos', ({ data }) => !data.borrador);
  return rss({
    title: ${js(cfg.nombre)},
    description: ${js(cfg.tematica)},
    site: context.site ?? 'https://example.com',
    items: articulos.map((a) => ({
      title: a.data.titulo,
      description: a.data.descripcion,
      pubDate: a.data.fecha,
      link: \`/\${a.data.seccion}/\${a.id}/\`,
    })),
  });
}
`
  );

  add(
    `src/content/articulos/bienvenida.mdx`,
    `---
titulo: ${js(recortar(`Bienvenida a ${cfg.nombre}`, 105))}
descripcion: ${js(recortar(cfg.tematica, 195))}
seccion: ${primeraSeccion}
fecha: ${new Date().toISOString().slice(0, 10)}
borrador: true
etiquetas: []
---

Este artículo de ejemplo queda en borrador. El radar y la autopublicación empezarán a escribir artículos reales en cuanto el workflow \`auto-publicar.yml\` corra por primera vez.
`
  );

  // ── radar ─────────────────────────────────────────────
  add(
    'radar/package.json',
    JSON.stringify(
      { name: `${cfg.slug}-radar`, type: 'module', private: true, dependencies: { 'rss-parser': '^3.13.0' } },
      null,
      2
    ) + '\n'
  );

  // Diccionario palabra→peso (positivo puntúa a favor, negativo penaliza), al
  // estilo de El Comando: cada señal se puntúa sumando los pesos de las
  // palabras clave que aparecen en su título/resumen.
  const pesosClave = Object.fromEntries(cfg.palabrasClave.map((p) => [p.palabra, p.peso]));

  add(
    'radar/radar.mjs',
    `#!/usr/bin/env node
/**
 * ============================================================
 *  ${comentario(cfg.nombre)} — radar
 *  Generado por Fábrica de medios. Escanea las fuentes de la
 *  categoría "${cfg.categoria}" y puntúa por relevancia con la
 *  temática del medio. Solo se consideran señal las noticias con
 *  puntuación positiva (usa --all para ver también las descartadas).
 * ============================================================
 */
import Parser from 'rss-parser';
import { writeFileSync, mkdirSync } from 'node:fs';

const FEEDS = ${JSON.stringify(cfg.fuentes.map((f) => ({ name: f.nombre, url: f.url })), null, 2)};

// Peso editorial: cuanto más alto, más encaja con la temática. Los pesos
// negativos penalizan (útil para descartar temas que se cuelan por una
// fuente genérica pero no van con la línea editorial).
const PALABRAS_CLAVE = ${JSON.stringify(pesosClave, null, 2)};

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(\`--\${name}\`);
  if (i === -1) return def;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const HOURS = Number(flag('hours', ${cfg.ventanaHoras}));
const TOP = Number(flag('top', 20));
const WANT_MD = args.includes('--md');
const WANT_JSON = args.includes('--json');
const SHOW_ALL = args.includes('--all');

const parser = new Parser({ timeout: 10000 });

function score(item) {
  const text = \`\${item.title} \${item.contentSnippet ?? ''}\`.toLowerCase();
  let s = 0;
  const hits = [];
  for (const [kw, w] of Object.entries(PALABRAS_CLAVE)) {
    if (text.includes(kw)) { s += w; if (w > 0) hits.push(kw); }
  }
  return { score: s, hits };
}

function timeAgo(date) {
  const h = Math.round((Date.now() - date.getTime()) / 3.6e6);
  return h < 1 ? 'ahora' : h < 24 ? \`hace \${h}h\` : \`hace \${Math.round(h / 24)}d\`;
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'user-agent': '${cfg.slug}-radar/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const parsed = await parser.parseString(await res.text());
    return { feed, items: parsed.items ?? [], error: null };
  } catch (e) {
    return { feed, items: [], error: e.message };
  }
}

async function main() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const cutoff = Date.now() - HOURS * 3.6e6;
  const errors = results.filter((r) => r.error);

  const todos = results.flatMap(({ feed, items }) =>
    items.map((it) => {
      const date = new Date(it.isoDate ?? it.pubDate ?? 0);
      return { ...it, source: feed.name, date, ...score(it) };
    })
  )
    .filter((it) => it.date.getTime() > cutoff)
    .filter((it) => SHOW_ALL || it.score > 0);

  const seen = new Set();
  const unique = todos.filter((it) => {
    const key = it.title.toLowerCase().replace(/\\W+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => b.score - a.score || b.date - a.date);
  const top = unique.slice(0, TOP);

  console.log(\`Radar ${backtick(cfg.nombre)} · \${top.length} señales en las últimas \${HOURS}h\`);
  for (const it of top) {
    console.log(\`- [\${it.score}] \${it.title} (\${it.source}, \${timeAgo(it.date)})\`);
  }
  if (errors.length) console.log(\`Fuentes caídas: \${errors.map((e) => e.feed.name).join(', ')}\`);

  if (WANT_MD) {
    const today = new Date().toISOString().slice(0, 10);
    mkdirSync('radar-digests', { recursive: true });
    writeFileSync(
      \`radar-digests/radar-\${today}.md\`,
      [\`# Radar — \${today}\`, '', ...top.map((it) => \`- **[\${it.title}](\${it.link})** — \${it.source}\`)].join('\\n')
    );
  }

  if (WANT_JSON) {
    mkdirSync('../public', { recursive: true });
    writeFileSync(
      '../public/radar.json',
      JSON.stringify({ generado: new Date().toISOString(), ventanaHoras: HOURS, senales: top.map((it) => ({
        titulo: it.title, enlace: it.link, fuente: it.source, fecha: it.date.toISOString(), score: it.score, hits: it.hits,
      })) }, null, 2)
    );
  }
}

main();
`
  );

  // ── autopublicación ───────────────────────────────────
  add(
    'scripts/auto-publicar.mjs',
    `#!/usr/bin/env node
/**
 * Lee public/radar.json, redacta con Claude las señales top que no se
 * hayan publicado ya, y escribe artículos MDX publicados directamente
 * (sin revisión humana). Pensado para correr desde
 * .github/workflows/auto-publicar.yml.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const SECCIONES = ${JSON.stringify(cfg.secciones)};
const CANTIDAD = ${cfg.cantidad};
const NOMBRE_MEDIO = ${JSON.stringify(cfg.nombre)};

const VOZ = \`Eres el redactor de \${NOMBRE_MEDIO}.

LÍNEA EDITORIAL: ${backtick(cfg.editorial)}

TEMÁTICA: ${backtick(cfg.tematica)}

REGLA DE VERACIDAD — la más importante:
Solo puedes afirmar lo que aparezca en el contexto que se te da. No inventes datos, cifras, fechas ni declaraciones. Si el contexto es escaso, escribe una pieza más corta: es preferible a rellenar.\`;

const PROMPT_NOTICIA = \`TAREA: reescribe la noticia que se te da como un artículo breve.

NO copies el texto original: reescríbelo con tu propia voz. Cita la fuente con atribución.

ESTRUCTURA (200-350 palabras, en Markdown/MDX):
1. Titular con # (H1). Concreto, sin clickbait.
2. Entradilla de una o dos frases que den la noticia.
3. Desarrollo: contexto, datos, implicaciones.
4. Cierre con una lectura o un apunte propio.

Puedes usar, si encajan, estos componentes MDX propios del medio:

<ElDato cifra="32" unidad="%" fuente="Nombre de la fuente">Contexto breve del dato.</ElDato>
<Cita autor="Nombre" cargo="cargo">Cita textual, solo si aparece literalmente en el contexto.</Cita>
<Callout tipo="lectura">Tu lectura personal, marcada como opinión.</Callout>

Devuelve SOLO el Markdown/MDX del artículo. Sin bloque de código, sin frontmatter, sin explicaciones.\`;

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9\\s-]/g, '').trim().replace(/\\s+/g, '-').slice(0, 70);
}

// El esquema de content.config.ts limita titulo (110) y descripcion (200);
// un titular real de RSS o de Claude puede superarlo de sobra, así que sin
// esto el build revienta en cuanto toca publicar un artículo así.
function recortar(texto, max) {
  const t = texto.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\\s+\\S*$/, '') + '…';
}

function elegirSeccion(item) {
  const texto = \`\${item.titulo} \${(item.hits || []).join(' ')}\`.toLowerCase();
  let mejor = SECCIONES[0];
  let mejorScore = -1;
  for (const s of SECCIONES) {
    const palabras = \`\${s.nombre} \${s.descriptor}\`.toLowerCase().split(/\\W+/).filter((p) => p.length >= 4);
    const score = palabras.filter((p) => texto.includes(p)).length;
    if (score > mejorScore) { mejorScore = score; mejor = s; }
  }
  return mejor.clave;
}

async function extraerArticulo(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return '';
    const html = await res.text();
    return html
      .replace(/<script[\\s\\S]*?<\\/script>/gi, '').replace(/<style[\\s\\S]*?<\\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ')
      .replace(/\\s+/g, ' ').trim().slice(0, 6000);
  } catch { return ''; }
}

async function redactar(item, textoOriginal) {
  const contexto = \`Titular: \${item.titulo}\\nFuente: \${item.fuente}\\nEnlace: \${item.enlace}\\n\\n\${textoOriginal ? \`TEXTO ORIGINAL:\\n\${textoOriginal}\` : ''}\`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: \`\${VOZ}\\n\\n\${PROMPT_NOTICIA}\`,
      messages: [{ role: 'user', content: contexto }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data));
  return (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\\n').trim();
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Falta ANTHROPIC_API_KEY en el entorno.');
    process.exit(1);
  }

  const radar = JSON.parse(readFileSync('public/radar.json', 'utf8'));
  const rutaPublicados = 'radar/publicados.json';
  const publicados = existsSync(rutaPublicados) ? JSON.parse(readFileSync(rutaPublicados, 'utf8')) : [];
  const yaPublicado = new Set(publicados);

  const candidatos = radar.senales.filter((s) => !yaPublicado.has(s.enlace)).slice(0, CANTIDAD);

  if (candidatos.length === 0) {
    console.log('Sin señales nuevas que redactar.');
    return;
  }

  mkdirSync('src/content/articulos', { recursive: true });

  for (const item of candidatos) {
    console.log(\`Redactando: \${item.titulo}\`);
    const textoOriginal = await extraerArticulo(item.enlace);
    let mdx;
    try {
      mdx = await redactar(item, textoOriginal);
    } catch (e) {
      console.error(\`  ✗ fallo redactando: \${e.message}\`);
      continue;
    }

    const tituloMatch = mdx.match(/^#\\s+(.+)$/m);
    const titulo = recortar(tituloMatch ? tituloMatch[1].trim() : item.titulo, 108);
    const cuerpo = tituloMatch ? mdx.replace(tituloMatch[0], '').trim() : mdx;
    const descripcion = recortar(cuerpo.replace(/[#*_>\`\\[\\]]/g, '').split('\\n').find((l) => l.trim().length > 40) ?? item.titulo, 195);
    const seccion = elegirSeccion(item);
    const slug = slugify(titulo);
    const fecha = new Date().toISOString().slice(0, 10);

    const frontmatter = \`---
titulo: \${JSON.stringify(titulo)}
descripcion: \${JSON.stringify(descripcion)}
seccion: \${seccion}
fecha: \${fecha}
fuente: \${JSON.stringify(item.fuente)}
borrador: false
etiquetas: []
---

\`;

    writeFileSync(\`src/content/articulos/\${slug}.mdx\`, frontmatter + cuerpo + '\\n');
    publicados.push(item.enlace);
    console.log(\`  ✓ publicado en /\${seccion}/\${slug}/\`);
  }

  mkdirSync('radar', { recursive: true });
  writeFileSync(rutaPublicados, JSON.stringify(publicados, null, 2));
}

main();
`
  );

  // ── GitHub Actions ────────────────────────────────────
  add(
    '.github/workflows/auto-publicar.yml',
    `name: auto-publicar
on:
  schedule:
    - cron: ${js(cfg.frecuenciaCron)}
  workflow_dispatch: {}
permissions:
  contents: write
concurrency:
  group: auto-publicar
  cancel-in-progress: false
jobs:
  publicar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Instalar dependencias del radar
        working-directory: radar
        run: npm install
      - name: Ejecutar radar
        working-directory: radar
        run: node radar.mjs --json --hours ${cfg.ventanaHoras}
      - name: Redactar y publicar
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: node scripts/auto-publicar.mjs
      - name: Commitear artículos nuevos
        run: |
          git config user.name "${cfg.slug}-bot"
          git config user.email "actions@github.com"
          git add -A src/content/articulos radar/publicados.json public/radar.json
          git commit -m "auto: nueva tanda de artículos" || echo "sin cambios"
          git push
`
  );

  // ── dashboard: editor + creador de cards para redes ──
  add(
    'src/lib/medio.ts',
    `export const NOMBRE_MEDIO = ${JSON.stringify(cfg.nombre)};
`
  );

  add(
    'src/pages/dashboard.astro',
    `---
/**
 * /dashboard — sala de redacción interna: editor de artículos + creador de
 * cards para redes sociales. Solo se renderiza en desarrollo (astro dev);
 * en el build de producción la página queda vacía.
 */
import { getCollection } from 'astro:content';
import { SECCIONES } from '../content.config';
import Dashboard from '../components/Dashboard/Dashboard';

const esDesarrollo = import.meta.env.DEV;

const articulos = esDesarrollo
  ? (await getCollection('articulos')).map((a) => ({
      id: a.id,
      titulo: a.data.titulo,
      seccion: a.data.seccion,
      etiquetas: a.data.etiquetas ?? [],
      borrador: a.data.borrador ?? false,
      url: \`/\${a.data.seccion}/\${a.id}/\`,
      cuerpo: a.body ?? '',
      meta: {
        titulo: a.data.titulo,
        descripcion: a.data.descripcion,
        seccion: a.data.seccion,
        fecha: a.data.fecha?.toISOString?.().slice(0, 10) ?? '',
        autor: a.data.autor,
        fuente: a.data.fuente ?? '',
        borrador: a.data.borrador ?? false,
        etiquetas: a.data.etiquetas ?? [],
        imagen: a.data.imagen ?? '',
        imagenCredito: a.data.imagenCredito ?? '',
      },
    }))
  : [];

const secciones = Object.entries(SECCIONES).map(([id, meta]) => ({
  id,
  nombre: meta.nombre,
  descriptor: meta.descriptor,
}));
---
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>{esDesarrollo ? ${js(`Dashboard · ${cfg.nombre}`)} : 'No disponible'}</title>
    <style is:global>
      :root {
        --primario: ${cfg.identidad.paleta.primario};
        --primario-oscuro: ${cfg.identidad.paleta.primarioOscuro};
        --acento: ${cfg.identidad.paleta.acento};
        --fondo: ${cfg.identidad.paleta.fondo};
        --panel: ${cfg.identidad.paleta.panel};
        --tinta: ${cfg.identidad.paleta.tinta};
        --tinta-suave: color-mix(in srgb, var(--tinta) 65%, transparent);
        --regla: color-mix(in srgb, var(--tinta) 12%, transparent);
        --ui: -apple-system, 'Segoe UI', system-ui, sans-serif;
        --mono: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
      }
      body { margin: 0; }
    </style>
  </head>
  <body>
    {esDesarrollo ? (
      <Dashboard client:only="react" articulos={articulos} secciones={secciones} />
    ) : (
      <main style="font-family:system-ui;padding:3rem;text-align:center;color:#9aa3b0;">
        <p>404</p>
      </main>
    )}
  </body>
</html>
`
  );

  ficheros.push(...construirDashboard());

  return ficheros;
}
