import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = resolve(__dirname, '../supabase/migrations')
const sql = readFileSync(resolve(dir, '0001_init.sql'), 'utf8')
/** Every migration in order: what a fresh project ends up with. */
const all = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(resolve(dir, f), 'utf8'))
  .join('\n')

const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]!)
const rlsEnabled = new Set(
  [...sql.matchAll(/alter table public\.(\w+)\s+enable row level security/g)].map((m) => m[1]!),
)
/** Tables whose four policies come from the loop at the bottom of the migration. */
const looped = new Set(
  [...(sql.slice(sql.indexOf('foreach t in array array['), sql.indexOf('end loop')).matchAll(/'(\w+)'/g))].map(
    (m) => m[1]!,
  ),
)
const explicit = new Set(
  [...sql.matchAll(/create policy \w+ on public\.(\w+)/g)].map((m) => m[1]!),
)

describe('every table ships its own policies', () => {
  it('found the tables to check', () => {
    // Guards the test itself: a parse that silently matches nothing would make
    // every assertion below vacuously pass.
    expect(tables.length).toBeGreaterThanOrEqual(11)
  })

  it('enables row level security on all of them', () => {
    expect(tables.filter((t) => !rlsEnabled.has(t))).toEqual([])
  })

  it('leaves none of them with RLS on and no policy, which denies everything', () => {
    expect(tables.filter((t) => !looped.has(t) && !explicit.has(t))).toEqual([])
  })

  it('scopes every generated policy to the calling user', () => {
    const loopBody = sql.slice(sql.indexOf('create policy %1$I_select'), sql.indexOf('$f$, t)'))
    expect(loopBody).toContain('auth.uid() = user_id')
    // An UPDATE policy without WITH CHECK lets a row be reassigned to someone else.
    expect(loopBody).toMatch(/for update using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/)
  })
})

describe('the safety record cannot be tidied away', () => {
  it('lets a user read and write their rejections but never edit or delete them', () => {
    expect(sql).toContain('create policy safety_rejections_select')
    expect(sql).toContain('create policy safety_rejections_insert')
    expect(sql).not.toContain('create policy safety_rejections_update')
    expect(sql).not.toContain('create policy safety_rejections_delete')
  })
})

describe('spend is not client-writable', () => {
  it('gives model_usage a read policy and nothing else', () => {
    expect(sql).toContain('create policy model_usage_select')
    for (const verb of ['insert', 'update', 'delete']) {
      expect(sql).not.toContain(`create policy model_usage_${verb}`)
    }
  })
})

describe('the security-definer functions', () => {
  it('pin search_path, without which the definer rights can be hijacked', () => {
    const definers = [...sql.matchAll(/security definer\s+set search_path = (\w+)/g)]
    expect(definers.length).toBe(2)
    for (const match of definers) expect(match[1]).toBe('public')
  })

  it('grants delete_all_my_data to users and the quota check to the server only', () => {
    expect(sql).toContain('grant execute on function public.delete_all_my_data() to authenticated')
    expect(sql).toContain(
      'grant execute on function public.consume_quota(uuid, text, integer) to service_role',
    )
    expect(sql).not.toContain('grant execute on function public.consume_quota(uuid, text, integer) to authenticated')
  })

  it('clears every user table in the delete function', () => {
    const body = sql.slice(sql.indexOf('declare uid uuid := auth.uid()'), sql.indexOf('revoke all on function public.delete_all_my_data'))
    for (const table of tables) {
      expect(body, `delete_all_my_data leaves ${table} behind`).toContain(`delete from public.${table}`)
    }
  })
})

describe('nothing callable with the anon key alone', () => {
  // Supabase grants EXECUTE on new functions in public directly to anon and
  // authenticated, so revoking from PUBLIC is not enough: a definer function
  // stays callable by anyone holding the key the app ships with. The live
  // project's security advisor found exactly that.
  // Header only — returns, language, security — so one function's scan cannot
  // run on into the next one's body.
  const definers = [...all.matchAll(/function public\.(\w+)\([^)]*\)\s+returns\s+\w+\s+language\s+\w+\s+security definer/g)].map(
    (m) => m[1]!,
  )

  it('found the definer functions', () => {
    expect(definers.sort()).toEqual(['consume_quota', 'delete_all_my_data'])
  })

  it.each(['consume_quota', 'delete_all_my_data'])('revokes %s from anon explicitly', (name) => {
    expect(all).toMatch(new RegExp(`revoke execute on function public\\.${name}\\([^)]*\\) from anon\\b`))
  })

  it('keeps the quota, which takes any user id, from signed-in users too', () => {
    expect(all).toMatch(/revoke execute on function public\.consume_quota\([^)]*\) from anon, authenticated/)
  })

  it('pins the trigger function\'s search_path', () => {
    expect(all).toContain("alter function public.touch_updated_at() set search_path = ''")
  })
})

describe('no meal photos are stored', () => {
  it('creates no storage bucket and no image column', () => {
    expect(sql.toLowerCase()).not.toContain('storage.buckets')
    expect(sql.toLowerCase()).not.toMatch(/\b(photo|image|picture)_?(url|path|id)?\s+(text|uuid|bytea)/)
  })
})
