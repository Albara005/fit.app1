/**
 * Key-value port. The app talks to this; the driver underneath is chosen once,
 * at startup, by whether Supabase credentials exist.
 */
export interface Kv {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
  keys(): string[]
}

function memoryKv(): Kv {
  const map = new Map<string, string>()
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
    keys: () => [...map.keys()],
  }
}

const PREFIX = 'peak:'

function webKv(storage: Storage): Kv {
  return {
    get: (k) => storage.getItem(PREFIX + k),
    set: (k, v) => storage.setItem(PREFIX + k, v),
    remove: (k) => storage.removeItem(PREFIX + k),
    keys: () =>
      Object.keys(storage)
        .filter((k) => k.startsWith(PREFIX))
        .map((k) => k.slice(PREFIX.length)),
  }
}

/**
 * Private browsing and blocked site data both make localStorage throw on
 * access, not on write, so the probe is a real read-write round trip.
 */
export function createKv(): Kv {
  try {
    if (typeof localStorage === 'undefined') return memoryKv()
    const probe = `${PREFIX}__probe`
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return webKv(localStorage)
  } catch {
    return memoryKv()
  }
}

export const kv = createKv()

export function readJson<T>(store: Kv, key: string, fallback: T): T {
  const raw = store.get(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(store: Kv, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value))
}
