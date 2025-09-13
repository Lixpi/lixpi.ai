import { sveltePreprocess } from 'svelte-preprocess';

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [
        sveltePreprocess({
            defaults: { style: 'scss' },
            scss: {
                prependData: `
                    @use "src/sass/_variables.scss" as *;
                    @use "src/sass/_transitions.scss" as *;
                    @use "src/sass/themes/themes.scss" as *;
                `
            },
            typescript: false    // Disable TypeScript processing in svelte-preprocess, it's broken and Svelte 5 now supports it out of the box. Using this preprocessor for SCSS only
        }),
        vitePreprocess({ script: true, style: false }),
    ],

    onwarn(warning, defaultHandler) {
        if (warning.code === 'css_unused_selector') return;    // Fuck off unused css selector warning

        // handle all other warnings normally
        defaultHandler(warning);
    },

    // kit: {        // Do I even need it? Isn't it only for Svelte-Kit ????????????????????????????????????????????????????????????????????????
    //     // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    //     // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    //     // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    //     adapter: adapter({    /// Do I really need this ????????????????????????????????????????????????????????????????????????????????????
    //         pages: 'build',
    //         assets: 'build',
    //         fallback: undefined,
    //         precompress: false,
    //         strict: true
    //     })
    // }
};

export default config;
