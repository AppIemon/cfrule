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

export async function GET({ cookies }) {
  const user = await getUserByToken(cookies.get(getSessionCookieName()));
  return json({ user });
}

export async function POST({ request, cookies }) {
  const body = await request.json();
  try {
    if (body.action === 'logout') {
      await logout(cookies.get(getSessionCookieName()));
      clearSessionCookie(cookies);
      return json({ user: null });
    }
    const result = body.action === 'signup' ? await signup(body) : await login(body);
    setSessionCookie(cookies, result.token);
    return json({ user: result.user });
  } catch (error) {
    return json({ error: error?.message || 'auth_failed' }, { status: 400 });
  }
}
