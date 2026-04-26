import { json } from '@sveltejs/kit';
import { analyzeReading, analyzeByType } from '$lib/server/readingEngine.js';

export async function POST({ request }) {
  const body = await request.json();
  if (body.type === 'I' || body.type === 'R' || body.type === 'A' || body.type === 'K') {
    return json(analyzeByType(body));
  }
  return json(analyzeReading(body));
}
