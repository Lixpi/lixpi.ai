import path from "path"
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svelte(),
    ],
    server: {    // This fixes watch mode on Windows
        host: true,
        strictPort: true,
        port: 5173,
        watch: {
            usePolling: true,
        },
    },
    // mode:'development',
    resolve: {
        alias: {
            $src: path.resolve("./src"),
            $lib: path.resolve("./packages/shadcn-svelte/lib"),
        },

        // YOU FUCKING PIECE OF FUCKING SHIT!!!!!
        // Without this it was throwing  (Error during service initialization Svelte error: lifecycle_function_unavailable`mount(...)` is not available on the server)
        // What the fuck does it even mean???
        // Found solution here:
        //      https://github.com/sveltejs/svelte/discussions/12037
        //      https://github.com/sveltejs/svelte/issues/11394
        conditions: ['browser']
        // END
    },


    // https://stackoverflow.com/questions/75056422/how-to-use-vitepreprocess-with-global-scss-mixins-in-sveltekit
    // css: {
    //     preprocessorOptions: {
    //         scss: {
    //             additionalData: `
    //                 @use "/src/sass/_variables.scss" as *;
    //                 @use "/src/sass/_transitions.scss" as *;
    //                 @use "/src/sass/themes/themes.scss" as *;
    //             `,

    //         },
    //     },
    // },
    // build: {
    //     rollupOptions: {
    //         onwarn: (warning, handler) => {
    //             const { code, frame } = warning;

    //             // Suppress css-unused-selector warnings from shape.css
    //             if (code === "css-unused-selector" && frame && frame.includes("shape")) {
    //                 return;
    //             }
    //             handler(warning);
    //         }
    //     }
    // }
    // END https://stackoverflow.com/questions/75056422/how-to-use-vitepreprocess-with-global-scss-mixins-in-sveltekit
})
