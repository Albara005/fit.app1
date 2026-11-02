#!/usr/bin/env node
// Serves the web export (dist/) from one container — Railway, or anything
// that hands a process a PORT. No dependencies on purpose: Node's own http and
// zlib cover it, so there is no library to approve and nothing to patch.
//
// Every file is read and compressed once, at start. A request is answered
// from that table and never touches the filesystem, so no path — "..",
// encoded or not — can reach a file outside the export.
//
// Nothing about a request is logged. Paths here name screens, not people, but
// the owner's rule is that a log carries no health data, and the simplest way
// to keep to it is to have no access log at all.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

/** Already-compressed formats gain nothing from a second pass. */
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.map', '.txt', '.svg', '.ico', '.ttf', '.otf', '.webmanifest'])

/**
 * Metro names these by content hash, so a changed file is a new URL: they can
 * be cached for a year. Everything else — index.html above all — is
 * revalidated, or a deploy would leave people on the old bundle.
 */
const IMMUTABLE = ['/_expo/static/', '/assets/']

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  // A health app has no reason to tell another site which screen sent someone.
  'Referrer-Policy': 'no-referrer',
  // The camera is for meal photos and barcodes, on this origin only. The web
  // camera asks for video alone, so the microphone can stay off.
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
  // Scripts from this origin only: injected markup cannot run code. Styles
  // need 'unsafe-inline' because react-native-web writes its own <style>
  // elements. connect-src is left open on purpose — the Supabase and food
  // database origins are build-time settings, and a wrong list here would
  // break sign-in with nothing on screen to say why.
  'Content-Security-Policy':
    "script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

/** Reads the export into memory: URL path → body, headers and compressed variants. */
export function loadSite(root) {
  const base = resolve(root)
  const files = new Map()
  for (const file of walk(base)) {
    const url = '/' + relative(base, file).split(sep).join('/')
    const ext = extname(file).toLowerCase()
    const body = readFileSync(file)
    const entry = {
      body,
      type: TYPES[ext] ?? 'application/octet-stream',
      etag: `"${createHash('sha256').update(body).digest('base64url').slice(0, 27)}"`,
      cache: IMMUTABLE.some((prefix) => url.startsWith(prefix))
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      br: null,
      gzip: null,
    }
    if (COMPRESSIBLE.has(ext) && body.length > 1024) {
      // Quality 9, not 11: on this bundle and its fonts 11 saves 53 KB of
      // 653 (8%) but takes 7.4 s instead of 0.45 s, paid on every restart.
      const br = brotliCompressSync(body, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_SIZE_HINT]: body.length },
      })
      const gzip = gzipSync(body, { level: 9 })
      if (br.length < body.length) entry.br = br
      if (gzip.length < body.length) entry.gzip = gzip
    }
    files.set(url, entry)
  }
  if (!files.has('/index.html')) throw new Error(`No index.html in ${base}. Run \`npm run build:web\` first.`)
  return files
}

/** The best encoding the client accepts, by its own q-values; identity if none. */
export function pickEncoding(header, entry) {
  const accepted = new Map()
  for (const part of String(header ?? '').split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';')
    if (!name) continue
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
    accepted.set(name, q ? Number(q.slice(2)) : 1)
  }
  const ok = (name) => (accepted.get(name) ?? accepted.get('*') ?? 0) > 0
  if (entry.br && ok('br')) return 'br'
  if (entry.gzip && ok('gzip')) return 'gzip'
  return null
}

/**
 * A missing path is a screen of the app when a browser is navigating to it —
 * the router decides what it shows. A missing script or image is a 404: sent
 * index.html instead, it fails later with a MIME error that hides the cause.
 */
function wantsPage(path, accept) {
  return extname(path) === '' || String(accept ?? '').includes('text/html')
}

export function createHandler(files) {
  const index = files.get('/index.html')
  return function handle(req, res) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value)
    // Railway terminates TLS and says so here, so this is only ever sent over
    // HTTPS. Without includeSubDomains: other hosts under the domain are not ours.
    if (req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000')
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Method not allowed')
      return
    }

    let path
    try {
      path = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname)
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Bad request')
      return
    }

    if (path === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(req.method === 'HEAD' ? undefined : 'ok')
      return
    }

    const entry = files.get(path === '/' ? '/index.html' : path) ?? (wantsPage(path, req.headers.accept) ? index : null)
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' })
      res.end('Not found')
      return
    }

    const headers = { 'Content-Type': entry.type, 'Cache-Control': entry.cache, ETag: entry.etag }
    if (entry.br || entry.gzip) headers.Vary = 'Accept-Encoding'

    if (req.headers['if-none-match'] === entry.etag) {
      res.writeHead(304, headers)
      res.end()
      return
    }

    const encoding = pickEncoding(req.headers['accept-encoding'], entry)
    const body = encoding ? entry[encoding] : entry.body
    if (encoding) headers['Content-Encoding'] = encoding
    headers['Content-Length'] = body.length
    res.writeHead(200, headers)
    res.end(req.method === 'HEAD' ? undefined : body)
  }
}

function main() {
  const root = process.env.WEB_ROOT ?? 'dist'
  const port = Number(process.env.PORT ?? 8080)
  const started = Date.now()
  const files = loadSite(root)
  // No host argument: Node listens on IPv6 and IPv4 both where it can, which
  // covers Railway's public and private networking alike.
  const server = createServer(createHandler(files))
  server.listen(port, () => {
    console.log(`serving ${files.size} files from ${root} on port ${port} (loaded in ${Date.now() - started} ms)`)
  })
  // Railway stops a deployment with SIGTERM: finish what is in flight, then go.
  const stop = () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10_000).unref()
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
