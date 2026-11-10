/**
 * Step 1 of the Bible data pipeline: download the source texts.
 *
 *   npm run bible:fetch
 *
 * Downloads each translation's USFM zip from eBible.org into .cache/sources/
 * and unzips it. You only need to run this when you want to refresh the text;
 * the processed output in src/data/bible/ is committed to git, so a normal
 * `npm run build` never needs the network.
 *
 * Behind a corporate proxy? Run with NODE_USE_ENV_PROXY=1 so Node's fetch
 * respects the HTTPS_PROXY environment variable.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { unzipSync } from 'fflate';
import { CACHE_DIR, SOURCES } from './bible/sources.ts';

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

const manifest: Record<string, { url: string; sha256: string; downloaded: string }> = {};

for (const source of SOURCES) {
  process.stdout.write(`Downloading ${source.label} from ${source.url} ... `);
  const zip = await download(source.url);
  const sha256 = createHash('sha256').update(zip).digest('hex');
  const outDir = join(CACHE_DIR, source.id);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const files = unzipSync(zip);
  let count = 0;
  for (const [name, data] of Object.entries(files)) {
    if (!name.endsWith('.usfm')) continue;
    // Guard against archive entries trying to escape the folder ("zip slip").
    const safe = name.split('/').pop()!;
    const target = join(outDir, safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
    count++;
  }
  manifest[source.id] = { url: source.url, sha256, downloaded: new Date().toISOString() };
  console.log(`${count} USFM files, sha256 ${sha256.slice(0, 12)}…`);
}

writeFileSync(join(CACHE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Done. Now run: npm run bible:build');
