import { json } from '@sveltejs/kit';
import { rankingSnapshot } from '$lib/server/gameService.js';

export async function GET() {
  return json(await rankingSnapshot());
}
