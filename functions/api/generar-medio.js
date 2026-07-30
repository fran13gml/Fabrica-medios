/**
 * functions/api/generar-medio.js
 *
 * Recibe la configuración completa del asistente, genera el proyecto Astro
 * del medio nuevo (vía src/lib/plantillas.ts) y lo sube a un repo de GitHub
 * recién creado. El token vive en el entorno del Worker, nunca en el
 * navegador — igual que /api/claude.js y /api/publicar.js en los medios
 * ya existentes.
 */
import { generarIdentidad } from '../../src/lib/logo';
import { construirProyecto } from '../../src/lib/plantillas';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

// Base64 seguro con acentos (btoa peta con no-ASCII en Workers).
function b64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function gh(env, path, init = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'fabrica-medios',
      ...(init.headers ?? {}),
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.GITHUB_TOKEN) {
    return json({ error: 'falta GITHUB_TOKEN en el entorno del Worker' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'json inválido' }, 400);
  }

  const { nombre, tematica, editorial, secciones, categoria, fuentes, frecuenciaLabel, frecuenciaCron, ventanaHoras, cantidad, palabrasClave } = body;

  if (!nombre?.trim() || !tematica?.trim() || !editorial?.trim()) {
    return json({ error: 'faltan nombre, temática o línea editorial' }, 400);
  }
  if (!Array.isArray(secciones) || secciones.length === 0) {
    return json({ error: 'necesitas al menos una sección' }, 400);
  }
  if (!Array.isArray(fuentes) || fuentes.length === 0) {
    return json({ error: 'necesitas al menos una fuente para el radar' }, 400);
  }
  if (!frecuenciaCron || !/^[\d*/,-]+(?:\s+[\d*/,-]+){4}$/.test(frecuenciaCron)) {
    return json({ error: 'frecuenciaCron inválida' }, 400);
  }

  const slug = slugify(nombre);
  if (!slug) return json({ error: 'no se pudo derivar un slug del nombre' }, 400);

  const identidad = generarIdentidad(nombre, tematica, editorial);

  // El asistente manda su propia lista de palabras clave con pesos (editada
  // a mano por quien crea el medio); si llega vacía o no llega, derivamos
  // una por defecto de la temática y las secciones para que el radar no se
  // quede sin ninguna señal de relevancia.
  const clavesRecibidas = Array.isArray(palabrasClave)
    ? palabrasClave
        .map((p) => ({ palabra: String(p?.palabra ?? '').trim().toLowerCase(), peso: Number(p?.peso) || 0 }))
        .filter((p) => p.palabra)
    : [];

  const clavesFinal = clavesRecibidas.length
    ? clavesRecibidas
    : Array.from(
        new Set(
          `${tematica} ${secciones.map((s) => `${s.nombre} ${s.descriptor}`).join(' ')}`
            .toLowerCase()
            .split(/[^a-záéíóúñü0-9]+/i)
            .filter((p) => p.length >= 4)
        )
      ).map((palabra) => ({ palabra, peso: 6 }));

  const cfg = {
    nombre,
    slug,
    tematica,
    editorial,
    secciones,
    categoria: categoria ?? 'actualidad-general',
    fuentes,
    frecuenciaLabel: frecuenciaLabel ?? frecuenciaCron,
    frecuenciaCron,
    ventanaHoras: Number(ventanaHoras) || 24,
    cantidad: Math.max(1, Math.min(10, Number(cantidad) || 1)),
    palabrasClave: clavesFinal,
    identidad,
  };

  const ficheros = construirProyecto(cfg);

  // 1. Crear el repo.
  const creado = await gh(env, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name: slug, private: true, auto_init: false, description: `${nombre} — ${tematica}` }),
  });

  if (!creado.ok) {
    const detalle = await creado.text();
    return json({ error: 'GitHub rechazó la creación del repo', detalle }, 502);
  }
  const repoData = await creado.json();
  const owner = repoData.owner.login;

  // 2. Subir cada fichero (repo recién creado, sin sha previo). GitHub aplica
  //    rate-limiting secundario a ráfagas de escritura, así que cada PUT
  //    reintenta con backoff antes de darse por vencido.
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  async function subirFichero(f, intentos = 3) {
    for (let intento = 1; intento <= intentos; intento++) {
      const res = await gh(env, `/repos/${owner}/${slug}/contents/${f.path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `fábrica: scaffold inicial (${f.path})`,
          content: b64(f.content),
          branch: 'main',
        }),
      });
      if (res.ok) return null;
      const reintentable = res.status === 403 || res.status === 429 || res.status >= 500;
      if (!reintentable || intento === intentos) return { path: f.path, status: res.status };
      await esperar(500 * 2 ** (intento - 1));
    }
  }

  const fallos = [];
  for (const f of ficheros) {
    const fallo = await subirFichero(f);
    if (fallo) fallos.push(fallo);
  }

  // 3. Registrar en el índice de medios (best-effort: si no hay D1 configurada
  //    todavía, no bloquea la respuesta).
  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO medios (id, nombre, tematica, editorial, paleta, secciones, categoria, fuentes, frecuencia_cron, cantidad, repo_url, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          slug,
          nombre,
          tematica,
          editorial,
          JSON.stringify(identidad.paleta),
          JSON.stringify(secciones),
          cfg.categoria,
          JSON.stringify(fuentes),
          frecuenciaCron,
          cfg.cantidad,
          repoData.html_url,
          fallos.length ? 'error' : 'listo'
        )
        .run();
    } catch (e) {
      // no bloquea: el repo ya existe aunque el registro falle
    }
  }

  return json({
    ok: fallos.length === 0,
    repo: repoData.html_url,
    ficherosSubidos: ficheros.length - fallos.length,
    ficherosFallidos: fallos,
    siguientesPasos: [
      `Añade el secreto ANTHROPIC_API_KEY en ${repoData.html_url}/settings/secrets/actions`,
      'Conecta el repo a un proyecto de Cloudflare Pages (build: npm run build, output: dist)',
      'El workflow auto-publicar.yml empezará a redactar y publicar solo, en cada disparo programado',
    ],
  });
}
