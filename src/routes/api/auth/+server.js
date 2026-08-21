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

/** 사용자에게 그대로 보여도 되는 실패 코드. 화면 문구는 클라이언트가 붙인다. */
const KNOWN_AUTH_ERRORS = new Set([
  'username_too_short',
  'password_too_short',
  'username_taken',
  'invalid_login',
  'guest_disabled'
]);

export async function GET({ cookies }) {
  const user = await getUserByToken(cookies.get(getSessionCookieName()));
  if (user?.isGuest) return json({ user: null });
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
    const ipLimit = rateLimit(`auth:ip:${ip}`, { limit: 20, windowMs: 5 * 60_000 });
    if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfter);

    if (body?.action === 'guest') {
      return json({ error: 'guest_disabled' }, { status: 403 });
    }

    const usernameKey = String(body?.username || '').toLowerCase().slice(0, 64);
    if (usernameKey) {
      const userLimit = rateLimit(`auth:user:${usernameKey}`, { limit: 10, windowMs: 5 * 60_000 });
      if (!userLimit.ok) return rateLimitResponse(userLimit.retryAfter);
    }

    const result = body?.action === 'signup' ? await signup(body) : await login(body);
    setSessionCookie(cookies, result.token, request);
    return json({ user: result.user });
  } catch (error) {
    // 아는 실패만 코드로 내보낸다. 그 외에는 드라이버 메시지가 브라우저까지
    // 새어 나가지 않도록 뭉뚱그린다(예: mongodb 의 E11000 원문).
    const code = String(error?.message || '');
    if (KNOWN_AUTH_ERRORS.has(code)) return json({ error: code }, { status: 400 });
    console.error('[auth] 처리 실패:', error);
    return json({ error: 'server_error' }, { status: 500 });
  }
}
