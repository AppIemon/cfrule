import { botJobInfo } from '$lib/server/botEngine.js';

export async function GET() {
  const info = await botJobInfo();
  return Response.json(info);
}
