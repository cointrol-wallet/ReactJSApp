import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import fs from "node:fs";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/ReactJSApp/" : "/",

  plugins: [
    react(),

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
  worker: { format: "es" },
  optimizeDeps: { exclude: ["@openforge-sh/liboqs"] },
}));