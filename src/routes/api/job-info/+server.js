import { json } from '@sveltejs/kit';
import { botJobInfo } from '$lib/server/botEngine.js';

export async function GET() {
  const info = await botJobInfo();
  return json(info);
}
