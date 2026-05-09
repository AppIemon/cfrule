import vercel from '@sveltejs/adapter-vercel';
import staticAdapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isApp = process.env.BUILD_TARGET === 'app';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: isApp
      ? staticAdapter({
          pages: 'build',
          assets: 'build',
          fallback: 'index.html',
          strict: false
        })
      : vercel(),
    paths: isApp ? { relative: false } : undefined
  }
};

export default config;
