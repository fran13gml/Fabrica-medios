/**
 * functions/api/medios.js — GET: lista de medios creados por la fábrica,
 * para el panel principal. Si la base D1 todavía no está configurada,
 * devuelve una lista vacía con un aviso en vez de fallar.
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return json({ medios: [], aviso: 'D1 (binding DB) no configurada todavía' });
  }
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, nombre, tematica, categoria, secciones, frecuencia_cron, cantidad, repo_url, estado, creado FROM medios ORDER BY creado DESC'
    ).all();
    return json({ medios: results ?? [] });
  } catch (e) {
    return json({ medios: [], aviso: `no se pudo leer D1: ${String(e)}` });
  }
}
