import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { patchPageSvelte } from './src/lib/build/pagePatch';

function charynnPagePatch(): Plugin {
  return {
    name: 'charynn-page-patch',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/routes/+page.svelte') && !id.endsWith('\\src\\routes\\+page.svelte')) return null;
      return {
        code: patchPageSvelte(code),
        map: null
      };
    }
  };
}

export default defineConfig({
  plugins: [charynnPagePatch(), sveltekit()],
  server: {
    fs: {
      allow: ['.']
    }
  }
});
