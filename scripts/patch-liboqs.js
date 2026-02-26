// Post-build script: fix liboqs falcon dynamic import paths in the worker bundle.
//
// The liboqs source resolves WASM wrapper modules with relative paths like
// "../../../../dist/falcon-512.min.js". When bundled into a Vite worker at
// /assets/falcon.worker-xxx.js, those four "../" hops traverse past
// the site root and land on /dist/falcon-512.min.js — a 404 on GitHub Pages.
//
// viteStaticCopy puts the liboqs dist files at /liboqs/*.
// This script rewrites the paths in the built worker file to match.
// Note: the Vite plugin in vite.config.ts (patchLiboqsFalconPaths) handles
// backtick-quoted template literals during the build transform phase; this
// script handles any remaining single/double-quoted string variants.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const BASE = "/";
const ASSETS_DIR = "dist/assets";

const workerFiles = readdirSync(ASSETS_DIR).filter((f) =>
  f.startsWith("falcon.worker")
);

if (workerFiles.length === 0) {
  console.warn("[patch-liboqs] No falcon.worker-*.js found in dist/assets — skipping.");
  process.exit(0);
}

const variants = [
  "falcon-512",
  "falcon-1024",
  "falcon-padded-512",
  "falcon-padded-1024",
];

for (const file of workerFiles) {
  const filePath = `${ASSETS_DIR}/${file}`;
  let code = readFileSync(filePath, "utf-8");
  const original = code;

  for (const name of variants) {
    // Match the broken path in both quote styles as emitted by rollup
    for (const q of ['"', "'"]) {
      const from = `${q}../../../../dist/${name}.min.js${q}`;
      const to = `${q}${BASE}liboqs/${name}.min.js${q}`;
      code = code.split(from).join(to);
    }
  }

  if (code !== original) {
    writeFileSync(filePath, code, "utf-8");
    console.log(`[patch-liboqs] Patched ${file}`);
  } else {
    console.warn(`[patch-liboqs] WARNING: no replacements made in ${file} — check paths.`);
  }
}
