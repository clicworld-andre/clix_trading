const { copyFileSync, existsSync, mkdirSync } = require('fs');
const { resolve, dirname } = require('path');

// Source wasm inside the Olm package
const src = resolve(__dirname, '../node_modules/@matrix-org/olm/olm.wasm');
// Destination inside public folder so it can be served statically by Next.js
const dest = resolve(__dirname, '../public/olm.wasm');

try {
  // Ensure the destination directory exists
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  copyFileSync(src, dest);
  // eslint-disable-next-line no-console
  console.log('✓ Copied olm.wasm to public directory');
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('✗ Failed to copy olm.wasm', err);
} 