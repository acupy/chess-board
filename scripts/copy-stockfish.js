import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(root, 'node_modules', 'stockfish', 'bin');
const dest = join(root, 'public', 'stockfish');

const files = [
  'stockfish-19-lite-single.js',
  'stockfish-19-lite-single.wasm',
];

if (!existsSync(join(bin, files[0]))) {
  console.warn('stockfish package not found; skip copy');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
for (const file of files) {
  copyFileSync(join(bin, file), join(dest, file));
}
console.log('Copied Stockfish lite-single into public/stockfish/');
