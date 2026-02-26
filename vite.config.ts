import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import fs from "node:fs";
import tailwindcss from "@tailwindcss/vite";

// Plugin that rewrites liboqs falcon WASM dynamic import paths.
// The liboqs source uses relative paths like `../../../../dist/falcon-512.min.js`
// that, when bundled into a worker file served from /ReactJSApp/assets/, traverse
// past the site root and resolve to /dist/falcon-512.min.js (404 on GitHub Pages).
// viteStaticCopy copies the liboqs dist files to /ReactJSApp/liboqs/, so we rewrite
// the paths to match. Must be in worker.plugins — user plugins in the main plugins
// array do not apply to Vite's separate worker Rollup build context.
function patchLiboqsFalconPaths(base: string) {
  return {
    name: "patch-liboqs-falcon-paths",
    enforce: "pre" as const,
    transform(code: string) {
      if (!code.includes("../../../../dist/falcon-")) return null;
      const names = [
        "falcon-512",
        "falcon-1024",
        "falcon-padded-512",
        "falcon-padded-1024",
      ];
      let patched = code;
      for (const name of names) {
        // Replace the browser branch template literal with an absolute path.
        // The Deno branch (.deno.js) is left unchanged — never reached in browsers.
        patched = patched
          .split(`\`../../../../dist/${name}.min.js\``)
          .join(`"${base}liboqs/${name}.min.js"`);
      }
      return patched !== code ? patched : null;
    },
  };
}

export default defineConfig(() => {
  const base = "/";

  return {
    base,

    plugins: [
      react(),
      tailwindcss(),

      viteStaticCopy({
        targets: [
          {
            src: "node_modules/@openforge-sh/liboqs/dist/*.{js,wasm}",
            dest: "liboqs",
          },
        ],
        watch: { reloadPageOnChange: true },
      }),

      {
        name: "serve-liboqs",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith("/liboqs/")) {
              const fileName = req.url.replace("/liboqs/", "");
              const filePath = path.join(
                __dirname,
                "node_modules/@openforge-sh/liboqs/dist",
                fileName
              );

              if (fs.existsSync(filePath)) {
                const ext = path.extname(filePath);
                res.setHeader(
                  "Content-Type",
                  ext === ".wasm"
                    ? "application/wasm"
                    : ext === ".js"
                    ? "application/javascript"
                    : "application/octet-stream"
                );
                fs.createReadStream(filePath).pipe(res);
                return;
              }
            }
            next();
          });
        },
      },
    ],

    resolve: {
      dedupe: ["react", "react-dom"],
      alias: { "@": path.resolve(__dirname, "src") },
    },

    server: { port: 5173, strictPort: true, open: true },

    worker: {
      format: "es",
      // Worker builds run in a separate Rollup context; plugins from the main
      // plugins array do not apply here. worker.plugins is the correct place.
      plugins: () => [patchLiboqsFalconPaths(base)],
    },

    optimizeDeps: { exclude: ["@openforge-sh/liboqs"] },
  };
});
