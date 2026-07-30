/**
 * functions/_middleware.js
 *
 * Protege toda la fábrica con autenticación básica (usuario/contraseña).
 * Sin esto, cualquiera que encuentre la URL podría crear repos con tu
 * GITHUB_TOKEN. El usuario es fijo ("fabrica"); la contraseña vive en el
 * secreto FABRICA_PASS del proyecto de Cloudflare Pages.
 */
export async function onRequest(context) {
  const { request, env, next } = context;

  const auth = request.headers.get('Authorization');
  const esperado = 'Basic ' + btoa(`fabrica:${env.FABRICA_PASS ?? ''}`);

  if (!env.FABRICA_PASS || auth !== esperado) {
    return new Response('No autorizado', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Fabrica de medios"' },
    });
  }

  return next();
}
