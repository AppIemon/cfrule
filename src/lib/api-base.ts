const REMOTE_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const REMOTE_WS = (import.meta.env.VITE_WS_BASE as string | undefined) ?? '';

export function apiUrl(path: string): string {
  if (!REMOTE_BASE) return path;
  if (/^https?:\/\//.test(path)) return path;
  return REMOTE_BASE.replace(/\/$/, '') + path;
}

export function wsUrl(path: string): string | null {
  if (REMOTE_WS === 'none') return null;
  if (!REMOTE_WS) {
    if (typeof location === 'undefined') return null;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}${path}`;
  }
  return REMOTE_WS.replace(/\/$/, '') + path;
}

export function isAppBuild(): boolean {
  return !!REMOTE_BASE;
}
