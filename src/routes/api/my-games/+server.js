import { json } from '@sveltejs/kit';
import { getOngoingGames } from '$lib/server/gameService.js';

export async function GET({ url }) {
  const nickname = url.searchParams.get('nickname');
  if (!nickname) return json([]);
  const games = await getOngoingGames(nickname);
  return json(games);
}
