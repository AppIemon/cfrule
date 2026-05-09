const APP_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
]);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}

export async function handle({ event, resolve }) {
  const origin = event.request.headers.get('origin') || '';
  const isApi = event.url.pathname.startsWith('/api/');
  const allow = APP_ORIGINS.has(origin);

  if (isApi && allow && event.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const response = await resolve(event);

  if (isApi && allow) {
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      response.headers.set(k, v);
    }
  }

  return response;
}
