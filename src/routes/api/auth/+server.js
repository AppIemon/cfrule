import { json } from '@sveltejs/kit';
import {
  clearSessionCookie,
  getSessionCookieName,
  getUserByToken,
  login,
  logout,
  setSessionCookie,
  signup
} from '$lib/server/auth.js';
import { clientIp, rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

export async function GET({ cookies }) {
  const user = await getUserByToken(cookies.get(getSessionCookieName()));
  return json({ user });
}

export async function POST(event) {
  const { request, cookies } = event;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    if (body?.action === 'logout') {
      await logout(cookies.get(getSessionCookieName()));
      clearSessionCookie(cookies);
      return json({ user: null });
    }

    const ip = clientIp(event);
    const usernameKey = String(body?.username || '').toLowerCase().slice(0, 64);
    const ipLimit = rateLimit(`auth:ip:${ip}`, { limit: 20, windowMs: 5 * 60_000 });
    if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfter);
    if (usernameKey) {
      const userLimit = rateLimit(`auth:user:${usernameKey}`, { limit: 10, windowMs: 5 * 60_000 });
      if (!userLimit.ok) return rateLimitResponse(userLimit.retryAfter);
    }

    const result = body?.action === 'signup' ? await signup(body) : await login(body);
    setSessionCookie(cookies, result.token, request);
    return json({ user: result.user });
  } catch (error) {
    return json({ error: error?.message || 'auth_failed' }, { status: 400 });
  }
}
