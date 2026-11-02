import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@^2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export interface Caller {
  userId: string
  /** Scoped to the caller: every query through it is still subject to RLS. */
  db: SupabaseClient
  /** Bypasses RLS. Only for quota accounting and job bookkeeping. */
  admin: SupabaseClient
}

/**
 * The project's `default` key of a kind, from the JSON object Supabase now puts
 * in the environment. The legacy anon/service_role keys it falls back to stop
 * working at the end of 2026, and a function still reading only them would
 * fail every request from that day.
 */
function projectKey(kind: 'PUBLISHABLE' | 'SECRET', legacy: string): string {
  try {
    const key = JSON.parse(Deno.env.get(`SUPABASE_${kind}_KEYS`) ?? '{}')?.default
    if (typeof key === 'string' && key.length > 0) return key
  } catch {
    // Malformed: fall through to the legacy variable.
  }
  return Deno.env.get(legacy)!
}

/**
 * Deployed with verify_jwt off: the platform's own check only understands
 * legacy-signed tokens, and getUser() below is the real check — it asks Auth,
 * so it holds whichever key signed the session.
 */
export async function authenticate(req: Request): Promise<Caller | null> {
  const authorization = req.headers.get('Authorization')
  if (!authorization) return null

  const url = Deno.env.get('SUPABASE_URL')!
  const publishable = projectKey('PUBLISHABLE', 'SUPABASE_ANON_KEY')
  const secret = projectKey('SECRET', 'SUPABASE_SERVICE_ROLE_KEY')

  const db = createClient(url, publishable, { global: { headers: { Authorization: authorization } } })
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) return null

  return { userId: data.user.id, db, admin: createClient(url, secret) }
}

/**
 * Server-enforced daily ceiling. The client cannot raise it, and a client that
 * loops does not get a larger bill than a client that does not.
 */
export async function withinQuota(caller: Caller, kind: string, limit: number): Promise<boolean> {
  const { data, error } = await caller.admin.rpc('consume_quota', {
    p_user: caller.userId,
    p_kind: kind,
    p_limit: limit,
  })
  if (error) return false
  return data === true
}

/**
 * Consent is per purpose. Sending a profile to a model hosted outside the
 * Sultanate needs the transfer grant, not just the processing grant.
 */
export async function hasConsent(caller: Caller, kind: string): Promise<boolean> {
  const { data } = await caller.db
    .from('consents')
    .select('granted')
    .eq('kind', kind)
    .order('decided_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.granted === true
}

/**
 * Logs carry a user id and an event name. No weight, no injuries, no allergies,
 * no meal contents — not in logs, not in crash reports, not in analytics.
 */
export function logEvent(userId: string, event: string, extra: Record<string, string | number> = {}) {
  console.log(JSON.stringify({ user_id: userId, event, ...extra }))
}
