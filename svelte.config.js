import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// On GitHub Pages this ships under /known-onboard. Set BASE_PATH in CI to that
// path; locally it stays empty so dev/preview work at the root. Const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Static adapter: the onboarding PWA is a self-contained client bundle.
		// It talks to the device over USB (WebSerial) and to the activation
		// backend over HTTP; there is no server of its own. Adapter: adapter({
			fallback: 'index.html'
		}),
		paths: {
			base
		}
	}
};

export default config;
