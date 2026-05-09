import { getSessionCookieName, getUserByToken } from '$lib/server/auth.js';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function handle({ event, resolve }) {
  const token = event.cookies.get(getSessionCookieName());
  event.locals.user = token ? await getUserByToken(token).catch(() => null) : null;

  if (event.url.pathname.startsWith('/api/') && STATE_CHANGING.has(event.request.method)) {
    const origin = event.request.headers.get('origin');
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== event.url.host) {
          return new Response('forbidden_origin', { status: 403 });
        }
      } catch {
        return new Response('forbidden_origin', { status: 403 });
      }
    }
  }

  return resolve(event);
}
