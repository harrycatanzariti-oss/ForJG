/**
 * Generates the PNG app icons from public/favicon.svg.
 *   node scripts/make-icons.ts
 * Run again only if you change the logo; the PNGs are committed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync('public/favicon.svg', 'utf8');
// "Maskable" icons need extra padding because phones crop them into circles or squircles.
const maskable = svg.replace(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 44 44"><rect x="-6" y="-6" width="44" height="44" fill="#0f172a"/>',
);

for (const [name, size, source] of [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['icon-maskable-512.png', 512, maskable],
  ['apple-touch-icon.png', 180, maskable],
] as const) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(`public/icons/${name}`, png);
  console.log(`wrote public/icons/${name}`);
}
