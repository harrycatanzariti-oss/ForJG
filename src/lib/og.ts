/**
 * Builds simple text-based social preview images (Open Graph) at build time.
 * Satori lays out the text as SVG; resvg turns the SVG into a PNG.
 * No external service is involved.
 */
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { SITE_NAME } from '~/config';

const font = (weight: number) => readFileSync(`node_modules/@fontsource/geist/files/geist-latin-${weight}-normal.woff`);
let fonts: { name: string; data: Buffer; weight: 400 | 600; style: 'normal' }[] | undefined;

// A tiny helper so we can describe the layout without JSX in a .ts file.
type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: (Node | string)[] | string): Node => ({
  type,
  props: { style, children },
});

// The five vestment colours at 30%, as a band down the left edge.
const BAND = [
  'rgba(46,160,67,0.3)',
  'rgba(130,80,223,0.3)',
  'rgba(219,97,162,0.3)',
  'rgba(207,34,46,0.3)',
  'rgba(212,167,44,0.3)',
];

export async function renderOg(title: string, subtitle: string): Promise<Buffer> {
  fonts ??= [
    { name: 'Geist', data: font(400), weight: 400, style: 'normal' },
    { name: 'Geist', data: font(600), weight: 600, style: 'normal' },
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
      background: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Geist',
      position: 'relative',
    },
    [
      el(
        'div',
        { position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, display: 'flex', flexDirection: 'column' },
        BAND.map((c) => el('div', { flex: 1, background: c })),
      ),
      el('div', { fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }, SITE_NAME),
      el('div', { display: 'flex', flexDirection: 'column', width: 1020 }, [
        el(
          'div',
          {
            fontSize: title.length > 40 ? 64 : 80,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            width: 1020,
          },
          title,
        ),
        el('div', { fontSize: 34, color: '#526070', marginTop: 24, lineHeight: 1.3, width: 1020 }, subtitle),
      ]),
      el('div', { fontSize: 24, color: '#526070', width: 1020 }, 'Free · No ads · No account'),
    ],
  );
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts });
  return new Resvg(svg).render().asPng();
}
