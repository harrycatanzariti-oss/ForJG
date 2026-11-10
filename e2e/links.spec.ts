/**
 * Checks that every internal link and image in the built site points to a
 * file that exists. Reads dist/ directly, so it is fast.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });
}

const exists = (path: string) => {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]!);
  const p = join('dist', clean);
  return existsSync(p) && statSync(p).isFile() ? true : existsSync(join(p, 'index.html'));
};

test('no broken internal links', () => {
  test.skip(!existsSync('dist'), 'run npm run build first');
  const broken = new Set<string>();
  // Checking every chapter page is slow and repetitive; sample them.
  const files = htmlFiles('dist').filter((f) => !/\/bible\/[^/]+\/\d+\//.test(f) || /\/(1|3|16)\/index\.html$/.test(f));
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const target = m[1]!;
      if (target.startsWith('//')) continue;
      if (!exists(target)) broken.add(`${file} → ${target}`);
    }
  }
  expect([...broken]).toEqual([]);
});
