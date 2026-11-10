/**
 * Builds simple text-based social preview images (Open Graph) at build time.
 * Satori lays out the text as SVG; resvg turns the SVG into a PNG.
 * No external service is involved.
 */
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { SITE_NAME } from '~/config';

const font = (weight: number) =>
  readFileSync(`node_modules/@fontsource/literata/files/literata-latin-${weight}-normal.woff`);
let fonts: { name: string; data: Buffer; weight: 400 | 600; style: 'normal' }[] | undefined;

// A tiny helper so we can describe the layout without JSX in a .ts file.
type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: (Node | string)[] | string): Node => ({
  type,
  props: { style, children },
});

export async function renderOg(title: string, subtitle: string, accent = '#8a3f17'): Promise<Buffer> {
  fonts ??= [
    { name: 'Literata', data: font(400), weight: 400, style: 'normal' },
    { name: 'Literata', data: font(600), weight: 600, style: 'normal' },
  ];
  const tree = el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '56px 72px',
      boxSizing: 'border-box',
      background: '#faf7f2',
      color: '#26221e',
      fontFamily: 'Literata',
      borderLeft: `24px solid ${accent}`,
    },
    [
      el('div', { fontSize: 30, color: accent, fontWeight: 600 }, SITE_NAME),
      el('div', { display: 'flex', flexDirection: 'column', width: 1020 }, [
        el('div', { fontSize: title.length > 40 ? 64 : 80, fontWeight: 600, lineHeight: 1.1, width: 1020 }, title),
        el('div', { fontSize: 34, color: '#5f574e', marginTop: 24, lineHeight: 1.3, width: 1020 }, subtitle),
      ]),
      el('div', { fontSize: 24, color: '#5f574e', width: 1020 }, 'Free · No ads · No account'),
    ],
  );
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts });
  return new Resvg(svg).render().asPng();
}
