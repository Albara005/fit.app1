import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, request, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHandler, loadSite, pickEncoding } from '../server/serve.mjs'

const BUNDLE = `console.log(${JSON.stringify('x'.repeat(4000))})`
let root: string
let server: Server
let port: number

function write(path: string, body: string) {
  const file = join(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
}

interface Reply { status: number; headers: IncomingHttpHeaders; body: Buffer }

function get(path: string, headers: Record<string, string> = {}, method = 'GET'): Promise<Reply> {
  return new Promise((done, fail) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => done({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }))
    })
    req.on('error', fail)
    req.end()
  })
}

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'serve-'))
  write('index.html', '<!DOCTYPE html><div id="root"></div>')
  write('_expo/static/js/web/entry-abc123.js', BUNDLE)
  write('assets/assets/fonts/Noto.abc123.ttf', 'font')
  write('favicon.ico', 'icon')
  // Outside the export: must never be reachable.
  writeFileSync(join(root, '..', 'serve-secret.txt'), 'secret')
  server = createServer(createHandler(loadSite(root)))
  await new Promise<void>((ready) => server.listen(0, '127.0.0.1', ready))
  port = (server.address() as AddressInfo).port
})

afterAll(() => {
  server.close()
  rmSync(root, { recursive: true, force: true })
  rmSync(join(root, '..', 'serve-secret.txt'), { force: true })
})

describe('only the export is served', () => {
  it.each(['/../serve-secret.txt', '/%2e%2e/serve-secret.txt', '/..%2fserve-secret.txt', '/%2E%2E%5Cserve-secret.txt'])(
    'never reaches a file outside it: %s',
    async (path) => {
      const reply = await get(path)
      expect(reply.body.toString()).not.toContain('secret')
    },
  )

  it('answers a malformed escape with 400, not a crash', async () => {
    expect((await get('/%E0%A4%A')).status).toBe(400)
  })
})

describe('app screens and missing files', () => {
  it('serves the app at the root', async () => {
    const reply = await get('/')
    expect(reply.status).toBe(200)
    expect(reply.headers['content-type']).toBe('text/html; charset=utf-8')
  })

  it('hands any screen path to the app, which routes it', async () => {
    const reply = await get('/workout/day-2')
    expect(reply.status).toBe(200)
    expect(reply.body.toString()).toContain('id="root"')
  })

  it('hands a navigation to the app even when the path has a dot', async () => {
    expect((await get('/workout/day.2', { Accept: 'text/html,application/xhtml+xml' })).status).toBe(200)
  })

  it('answers a missing script with 404 rather than the page', async () => {
    const reply = await get('/_expo/static/js/web/entry-gone.js', { Accept: '*/*' })
    expect(reply.status).toBe(404)
    expect(reply.headers['content-type']).toBe('text/plain; charset=utf-8')
  })
})

describe('caching', () => {
  it('keeps content-hashed files for a year', async () => {
    for (const path of ['/_expo/static/js/web/entry-abc123.js', '/assets/assets/fonts/Noto.abc123.ttf']) {
      expect((await get(path)).headers['cache-control']).toBe('public, max-age=31536000, immutable')
    }
  })

  it('revalidates the page, so a deploy reaches people', async () => {
    expect((await get('/')).headers['cache-control']).toBe('no-cache')
    expect((await get('/today')).headers['cache-control']).toBe('no-cache')
  })

  it('answers a matching ETag with 304 and no body', async () => {
    const first = await get('/')
    const again = await get('/', { 'If-None-Match': String(first.headers.etag) })
    expect(again.status).toBe(304)
    expect(again.body.length).toBe(0)
  })
})

describe('compression', () => {
  it('sends brotli when accepted, and it decodes to the file', async () => {
    const reply = await get('/_expo/static/js/web/entry-abc123.js', { 'Accept-Encoding': 'gzip, deflate, br' })
    expect(reply.headers['content-encoding']).toBe('br')
    expect(reply.headers.vary).toBe('Accept-Encoding')
    expect(brotliDecompressSync(reply.body).toString()).toBe(BUNDLE)
    expect(Number(reply.headers['content-length'])).toBe(reply.body.length)
  })

  it('falls back to gzip, then to none', async () => {
    const gz = await get('/_expo/static/js/web/entry-abc123.js', { 'Accept-Encoding': 'gzip' })
    expect(gz.headers['content-encoding']).toBe('gzip')
    expect(gunzipSync(gz.body).toString()).toBe(BUNDLE)
    const plain = await get('/_expo/static/js/web/entry-abc123.js')
    expect(plain.headers['content-encoding']).toBeUndefined()
    expect(plain.body.toString()).toBe(BUNDLE)
  })

  it('honours a refusal by q-value', () => {
    const entry = { br: Buffer.from('b'), gzip: Buffer.from('g') }
    expect(pickEncoding('br;q=0, gzip', entry)).toBe('gzip')
    expect(pickEncoding('*;q=0', entry)).toBeNull()
    expect(pickEncoding('*', entry)).toBe('br')
    expect(pickEncoding(undefined, entry)).toBeNull()
  })
})

describe('the rest of the contract', () => {
  it('has a health check for the deploy', async () => {
    const reply = await get('/healthz')
    expect(reply.status).toBe(200)
    expect(reply.headers['cache-control']).toBe('no-store')
  })

  it('refuses writes', async () => {
    const reply = await get('/', {}, 'POST')
    expect(reply.status).toBe(405)
    expect(reply.headers.allow).toBe('GET, HEAD')
  })

  it('answers HEAD with headers only', async () => {
    const reply = await get('/', {}, 'HEAD')
    expect(reply.status).toBe(200)
    expect(reply.body.length).toBe(0)
  })

  it('sends the security headers on every reply, errors included', async () => {
    for (const path of ['/', '/missing.png']) {
      const { headers } = await get(path)
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
      expect(headers['content-security-policy']).toContain("script-src 'self'")
      expect(headers['permissions-policy']).toContain('camera=(self)')
    }
  })

  it('pins HTTPS only when the request came over it', async () => {
    expect((await get('/')).headers['strict-transport-security']).toBeUndefined()
    expect((await get('/', { 'X-Forwarded-Proto': 'https' })).headers['strict-transport-security']).toBe('max-age=31536000')
  })

  it('refuses to start without a build', () => {
    const empty = mkdtempSync(join(tmpdir(), 'serve-empty-'))
    try {
      expect(() => loadSite(empty)).toThrow(/build:web/)
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })
})
