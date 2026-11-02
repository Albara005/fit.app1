import { localRepo } from './local'
import type { Repo } from './repo'
import { isSupabaseConfigured, supabaseRepo } from './supabase'

let instance: Repo | null = null

/**
 * Chosen once. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * and the same screens run against Postgres with RLS instead of the browser.
 */
export function repo(): Repo {
  if (!instance) instance = isSupabaseConfigured() ? supabaseRepo() : localRepo()
  return instance
}

export * from './repo'
export { isSupabaseConfigured, SUPABASE_REGION } from './supabase'
