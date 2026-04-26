import { json } from '@sveltejs/kit';
import { searchInEngine } from '$lib/server/readingEngine.js';

export async function GET({ url }) {
  return json(searchInEngine(url.searchParams.get('q') || ''));
}
