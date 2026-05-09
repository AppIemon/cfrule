import { getSessionCookieName, getUserByToken } from '$lib/server/auth.js';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const APP_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
]);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}

export async function handle({ event, resolve }) {
  const origin = event.request.headers.get('origin') || '';
  const isApi = event.url.pathname.startsWith('/api/');
  const isAppOrigin = APP_ORIGINS.has(origin);

  // CORS preflight for the native app webview.
  if (isApi && isAppOrigin && event.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const token = event.cookies.get(getSessionCookieName());
  event.locals.user = token ? await getUserByToken(token).catch(() => null) : null;

  if (isApi && STATE_CHANGING.has(event.request.method) && origin && !isAppOrigin) {
    try {
      if (new URL(origin).host !== event.url.host) {
        return new Response('forbidden_origin', { status: 403 });
      }
    } catch {
      return new Response('forbidden_origin', { status: 403 });
    }
  }

  const response = await resolve(event);

  if (isApi && isAppOrigin) {
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      response.headers.set(k, v);
    }
  }

  return response;
}
