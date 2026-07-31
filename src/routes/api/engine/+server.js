import { json } from '@sveltejs/kit';
import { engineStatus, loadCrossDictionary } from '$lib/server/botEngine.js';
import { clientIp, rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

// Engine / dictionary customization surface.
//   GET  /api/engine            → current dictionary config + load state + jobs
//   POST /api/engine {dictionary:'roble'|'kkutu'} → load that cross dictionary
export async function GET(event) {
  const key = `engine:ip:${clientIp(event)}`;
  const limit = rateLimit(key, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);
  try {
    return json(await engineStatus());
  } catch (error) {
    return json({ error: error?.message || 'engine_error' }, { status: 500 });
  }
}

export async function POST(event) {
  const { request } = event;
  const key = `engine:load:${clientIp(event)}`;
  const limit = rateLimit(key, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }

  const dictionary = String(body?.dictionary || '').slice(0, 24);
  if (!dictionary) return json({ error: 'missing_dictionary' }, { status: 400 });
  try {
    const result = await loadCrossDictionary(dictionary);
    return json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return json({ error: error?.message || 'engine_error' }, { status: 500 });
  }
}
