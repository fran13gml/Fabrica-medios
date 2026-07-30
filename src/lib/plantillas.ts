/**
 * Generador del proyecto Astro del medio nuevo: dado el resultado del
 * asistente, produce la lista completa de ficheros (ruta + contenido) que
 * se suben al repo recién creado. Sigue el mismo patrón que
 * CaminandoAChamartin y El Comando (Astro + Cloudflare Pages + radar +
 * autopublicación), pero parametrizado para cualquier temática.
 */
import type { Identidad } from './logo';
import { construirDashboard } from './plantillas-dashboard';

export interface Seccion {
  clave: string;
  nombre: string;
  descriptor: string;
}

export interface Fuente {
  nombre: string;
  url: string;
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
  identidad: Identidad;
}

export interface Fichero {
  path: string;
  content: string;
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
    (s) => `  '${s.clave}': { nombre: '${s.nombre}', descriptor: '${s.descriptor}' },`
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
    autor: z.string().default('${cfg.nombre}'),
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
const tituloCompleto = titulo === '${cfg.nombre}' ? '${cfg.nombre}' : \`\${titulo} · ${cfg.nombre}\`;
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
    <link rel="alternate" type="application/rss+xml" title="${cfg.nombre}" href="/rss.xml" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={tituloCompleto} />
    <meta property="og:description" content={descripcion} />
    <meta property="og:site_name" content="${cfg.nombre}" />
    {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
  </head>
  <body>
    <Header />
    <main class:list={[ancho]}>
      <slot />
    </main>
    <footer class="pie">
      <p>${cfg.nombre} — generado y mantenido por Fábrica de medios.</p>
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
    --ui: -apple-system, 'Segoe UI', system-ui, sans-serif;
    --texto: Georgia, 'Times New Roman', serif;
    --mono: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--fondo);
    color: var(--tinta);
    font-family: var(--texto);
    line-height: 1.65;
  }

  main { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
  main.panorama { max-width: 78rem; }

  a { color: inherit; }
  a:focus-visible { outline: 2px solid var(--primario); outline-offset: 2px; }
  h1, h2, h3 { font-family: var(--ui); line-height: 1.25; letter-spacing: -0.01em; }
  code { font-family: var(--mono); }
  pre { background: var(--panel); color: var(--tinta); padding: 1rem 1.2rem; overflow-x: auto; border-left: 3px solid var(--primario); border-radius: var(--radio); }

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
  <a href="/" class="marca" aria-label="${cfg.nombre} — portada">
    <img src="/favicon.svg" alt="" class="marca-logo" width="28" height="28" />
    <span class="marca-nombre">${cfg.nombre}</span>
  </a>
  <nav class="nav" aria-label="Secciones">
    <ul>
      {secciones.map(([clave, s]) => (
        <li>
          <a href={\`/\${clave}/\`} class:list={['seccion', { activa: esActiva(clave) }]} aria-current={esActiva(clave) ? 'page' : undefined}>
            <span class="seccion-nombre">{s.nombre}</span>
            <span class="seccion-label">{s.descriptor}</span>
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
    padding: 0.8rem 1.2rem;
  }
  .marca { display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; font-weight: 800; font-size: 1.05rem; color: var(--tinta); }
  .marca-logo { border-radius: 6px; }
  .nav ul { display: flex; gap: 4px; margin: 0; padding: 0; list-style: none; overflow-x: auto; }
  .seccion { display: inline-flex; align-items: baseline; gap: 6px; padding: 0.5rem 0.6rem; text-decoration: none; border-bottom: 2px solid transparent; white-space: nowrap; }
  .seccion-nombre { color: var(--tinta); font-size: 0.84rem; font-weight: 700; text-transform: lowercase; }
  .seccion-label { color: var(--tinta-suave); font-size: 0.76rem; }
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
  add(
    'src/pages/index.astro',
    `---
import Base from '../layouts/Base.astro';
import { getCollection } from 'astro:content';
import { SECCIONES } from '../content.config';

const articulos = (await getCollection('articulos', ({ data }) => !data.borrador))
  .sort((a, b) => b.data.fecha.valueOf() - a.data.fecha.valueOf());
---
<Base titulo="${cfg.nombre}" descripcion="${cfg.tematica}" ancho="panorama">
  <section class="portada">
    {articulos.length === 0 && <p>Todavía no hay artículos publicados. El radar y la autopublicación están en marcha.</p>}
    <ul class="rejilla">
      {articulos.map((a) => (
        <li>
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
  .rejilla li { background: var(--panel); border-radius: var(--radio); box-shadow: var(--sombra); overflow: hidden; }
  .rejilla a { display: block; padding: 1.2rem; text-decoration: none; color: var(--tinta); }
  .seccion-tag { font-family: var(--ui); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primario); font-weight: 700; }
  .rejilla h2 { font-size: 1.15rem; margin: 0.4rem 0; }
  .rejilla p { font-size: 0.9rem; color: var(--tinta-suave); margin: 0; }
</style>
`
  );

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
  <h1>{info.nombre} <small>— {info.descriptor}</small></h1>
  <ul class="lista">
    {articulos.map((a) => (
      <li><a href={\`/\${seccion}/\${a.id}/\`}>{a.data.titulo}</a><p>{a.data.descripcion}</p></li>
    ))}
  </ul>
  {articulos.length === 0 && <p>Sin artículos todavía en esta sección.</p>}
</Base>
<style>
  .lista { list-style: none; margin: 1.5rem 0; padding: 0; }
  .lista li { padding: 1rem 0; border-bottom: 1px solid var(--regla); }
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
    <Content />
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
    title: '${cfg.nombre}',
    description: '${cfg.tematica}',
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
titulo: "Bienvenida a ${cfg.nombre}"
descripcion: ${JSON.stringify(cfg.tematica)}
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

  const palabrasClave = Array.from(
    new Set(
      `${cfg.tematica} ${cfg.secciones.map((s) => `${s.nombre} ${s.descriptor}`).join(' ')}`
        .toLowerCase()
        .split(/[^a-záéíóúñü0-9]+/i)
        .filter((p) => p.length >= 4)
    )
  );

  add(
    'radar/radar.mjs',
    `#!/usr/bin/env node
/**
 * ============================================================
 *  ${cfg.nombre} — radar
 *  Generado por Fábrica de medios. Escanea las fuentes de la
 *  categoría "${cfg.categoria}" y puntúa por relevancia con la
 *  temática del medio.
 * ============================================================
 */
import Parser from 'rss-parser';
import { writeFileSync, mkdirSync } from 'node:fs';

const FEEDS = ${JSON.stringify(cfg.fuentes.map((f) => ({ name: f.nombre, url: f.url })), null, 2)};

const PALABRAS_CLAVE = ${JSON.stringify(palabrasClave)};

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

const parser = new Parser({ timeout: 10000 });

function score(item) {
  const text = \`\${item.title} \${item.contentSnippet ?? ''}\`.toLowerCase();
  let s = 0;
  const hits = [];
  for (const kw of PALABRAS_CLAVE) {
    if (text.includes(kw)) { s += 5; hits.push(kw); }
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
  ).filter((it) => it.date.getTime() > cutoff);

  const seen = new Set();
  const unique = todos.filter((it) => {
    const key = it.title.toLowerCase().replace(/\\W+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => b.score - a.score || b.date - a.date);
  const top = unique.slice(0, TOP);

  console.log(\`Radar ${cfg.nombre} · \${top.length} señales en las últimas \${HOURS}h\`);
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

LÍNEA EDITORIAL: ${cfg.editorial.replace(/`/g, "'").replace(/\\/g, '\\\\')}

TEMÁTICA: ${cfg.tematica.replace(/`/g, "'").replace(/\\/g, '\\\\')}

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
    const titulo = tituloMatch ? tituloMatch[1].trim() : item.titulo;
    const cuerpo = tituloMatch ? mdx.replace(tituloMatch[0], '').trim() : mdx;
    const descripcion = cuerpo.replace(/[#*_>\`\\[\\]]/g, '').split('\\n').find((l) => l.trim().length > 40)?.slice(0, 195) ?? item.titulo;
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
    - cron: "${cfg.frecuenciaCron}"
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
    <title>{esDesarrollo ? 'Dashboard · ${cfg.nombre}' : 'No disponible'}</title>
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
