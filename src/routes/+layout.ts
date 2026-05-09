export const ssr = !import.meta.env.VITE_APP_BUILD;
export const prerender = !!import.meta.env.VITE_APP_BUILD;
export const trailingSlash = 'ignore';
