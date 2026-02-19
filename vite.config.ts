import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'node:fs';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@openforge-sh/liboqs/dist/*.{js,wasm}',
          dest: 'dist'
        }
      ],
      // Also copy for dev server
      watch: {
        reloadPageOnChange: true
      }
    }),
    // Custom plugin to serve liboqs files in dev mode
    {
      name: 'serve-liboqs',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/dist/')) {
            const fileName = req.url.replace('/dist/', '');
            const filePath = path.join(
              __dirname,
              'node_modules/@openforge-sh/liboqs/dist',
              fileName
            );

            if (fs.existsSync(filePath)) {
              const ext = path.extname(filePath);
              const contentType =
                ext === '.wasm' ? 'application/wasm' :
                ext === '.js' ? 'application/javascript' :
                'application/octet-stream';

              res.setHeader('Content-Type', contentType);
              res.setHeader('Access-Control-Allow-Origin', '*');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          next();
        });
      }
    }
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: { "@": path.resolve(__dirname, "src") }
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true,
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@openforge-sh/liboqs']
  }
});

