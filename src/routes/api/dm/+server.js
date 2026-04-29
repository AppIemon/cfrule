import { json } from '@sveltejs/kit';
import { getSessionCookieName, getUserByToken } from '$lib/server/auth.js';
import { addDirectMessage, getDirectMessages, getDMInbox } from '$lib/server/gameService.js';

async function getAuthedUser(cookies) {
  return getUserByToken(cookies.get(getSessionCookieName()));
}

export async function GET({ url, cookies }) {
  const user = await getAuthedUser(cookies);
  if (!user) return json({ error: 'unauthenticated' }, { status: 401 });

  const withUser = url.searchParams.get('with');
  if (withUser) {
    const messages = getDirectMessages(user.nickname, withUser);
    return json({ messages });
  }

  const inbox = getDMInbox(user.nickname);
  return json({ inbox });
}

export async function POST({ request, cookies }) {
  const user = await getAuthedUser(cookies);
  if (!user) return json({ error: 'unauthenticated' }, { status: 401 });

  const body = await request.json();
  const { to, text } = body;
  if (!to || !text?.trim()) return json({ error: 'invalid' }, { status: 400 });
  if (to === user.nickname) return json({ error: 'cannot dm yourself' }, { status: 400 });

  addDirectMessage({ from: user.nickname, to, text: text.trim() });
  return json({ ok: true });
}
