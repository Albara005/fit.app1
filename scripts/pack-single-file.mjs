#!/usr/bin/env node
// Packs `expo export --platform web` output into one self-contained HTML file:
// no server, no sibling requests, nothing to deploy but the file itself. Used
// for previews and for hosts that will only take a single page.
//
// The file deliberately omits <html>, <head> and <body>. Browsers imply them,
// so it opens directly, and it can also be pasted into a host that supplies its
// own document skeleton.
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const DIST = resolve(process.argv[2] ?? 'dist')
const OUT = resolve(process.argv[3] ?? 'dist-single/peak-fitness.html')

const indexHtml = join(DIST, 'index.html')
if (!existsSync(indexHtml)) {
  console.error(`No build at ${DIST}. Run \`npm run build:web\` first.`)
  process.exit(1)
}

// Read the entry from index.html rather than hard-coding it: Metro puts a
// content hash in the filename, so it changes on every build.
const html = readFileSync(indexHtml, 'utf8')
const entryPath = html.match(/<script src="([^"]+)"/)?.[1]
if (!entryPath) {
  console.error('Could not find the entry script in dist/index.html.')
  process.exit(1)
}

const entryFile = join(DIST, entryPath.replace(/^\//, ''))
if (!existsSync(entryFile)) {
  console.error(`Entry bundle missing: ${entryFile}`)
  process.exit(1)
}

let js = readFileSync(entryFile, 'utf8')

// Longest first, so a path that is a prefix of another cannot corrupt it.
// Fonts too: the self-hosted faces are what every screen is set in, and
// without them the preview paints in the fallback face.
const assetPaths = [...new Set(js.match(/\/assets\/[A-Za-z0-9./_@-]+\.(?:png|jpg|jpeg|gif|webp|svg|ttf|otf|woff2?)/g) ?? [])]
  .sort((a, b) => b.length - a.length)

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
}
const missing = []
let inlined = 0

for (const path of assetPaths) {
  // app.json's icon, splash and favicon are referenced by their source paths
  // rather than the hashed ones the exporter writes under dist/assets.
  const file = [join(DIST, path.slice(1)), path.slice(1)].find(existsSync)
  if (!file) {
    missing.push(path)
    continue
  }
  const ext = path.split('.').pop().toLowerCase()
  js = js.split(path).join(`data:${MIME[ext] ?? 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}`)
  inlined++
}

// A literal </script> anywhere in the bundle would close the tag early.
const inlineSafe = js.replaceAll('</script', '<\\/script')

const page = `<title>Peak Fitness</title>
<style>
  /* The page paints its own ground rather than borrowing the host's, or a
     host of the other theme shows through every transparent edge. It follows
     the device like the app does, so the first frame does not flash the other
     theme before the app takes over the body colour. */
  html, body { height: 100%; margin: 0; background: #0B140C; overflow: hidden; }
  #root { display: flex; height: 100%; flex: 1; background: #0B140C; }
  @media (prefers-color-scheme: light) { html, body, #root { background: #F7F9F4; } }
</style>
<div id="root"></div>
<script>
  // Served under its own filename, the router would read that as a route and
  // open on "page not found". Such a path is never one of the app's, so the
  // app starts at its root instead. A host that refuses the change keeps it.
  try { if (/\.html?$/.test(location.pathname)) history.replaceState(null, '', '/') } catch {}
</script>
<script>${inlineSafe}</script>
`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, page)

const unresolvedAssets = (page.match(/["'(]\/assets\//g) ?? []).length
const lazyChunks = (page.match(/\/_expo\/static\/js\/web\//g) ?? []).length
console.log(`entry     ${entryPath}`)
console.log(`assets    ${inlined}/${assetPaths.length} inlined${missing.length ? ` — MISSING ${missing.join(', ')}` : ''}`)
console.log(`unresolved ${unresolvedAssets} asset reference(s) — must be 0`)
// These are the `await import('expo-notifications')` chunks. They sit behind a
// Platform.OS === 'web' early return, so the web build never requests them —
// confirmed by serving the packed file with nothing else reachable.
console.log(`lazy      ${lazyChunks} chunk URL(s), unreachable on web`)
console.log(`size      ${(Buffer.byteLength(page) / 1e6).toFixed(2)} MB`)
console.log(`out       ${OUT}`)

// The two lazy chunks are the `await import('expo-notifications')` calls, which
// sit behind a Platform.OS === 'web' early return and are never requested on
// the web. Anything else left over would break the standalone file.
if (missing.length > 0 || unresolvedAssets > 0) process.exit(1)
