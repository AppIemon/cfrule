const REMOTE_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? (import.meta.env.VITE_APP_BUILD ? 'https://cfrule.vercel.app' : '');
const REMOTE_WS = (import.meta.env.VITE_WS_BASE as string | undefined) ?? '';
const IS_APP_BUILD = !!import.meta.env.VITE_APP_BUILD;

export function apiUrl(path: string): string {
  if (!REMOTE_BASE) return path;
  if (/^https?:\/\//.test(path)) return path;
  const p = path.startsWith('/') ? path : '/' + path;
  return REMOTE_BASE.replace(/\/$/, '') + p;
}

export function wsUrl(path: string): string | null {
  if (REMOTE_WS === 'none') return null;
  if (REMOTE_WS) return REMOTE_WS.replace(/\/$/, '') + path;
  if (IS_APP_BUILD) return null;
  if (typeof location === 'undefined') return null;
  const host = location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  if (!isLocal) return null;
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${location.host}${path}`;
}

export function isAppBuild(): boolean {
  return IS_APP_BUILD;
}
