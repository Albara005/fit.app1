import { useEffect } from 'react'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { isSupabaseConfigured, supabase } from '../data/supabase'

export { isCodeShaped, isEmailShaped } from './credentials'

export const sessionKey = ['session'] as const

export interface SessionState {
  /** Null when signed out, and also when the app runs with no backend at all. */
  userId: string | null
  /** False when there is no backend, in which case nothing needs signing in. */
  required: boolean
}

/**
 * Email one-time codes rather than passwords. There is no password to store, no
 * reset flow to build, and no credential for a phone left on a table to leak.
 */
export function useSession(): UseQueryResult<SessionState> {
  const qc = useQueryClient()

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const { data } = supabase().auth.onAuthStateChange(() => {
      void qc.invalidateQueries({ queryKey: sessionKey })
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  return useQuery({
    queryKey: sessionKey,
    queryFn: async (): Promise<SessionState> => {
      if (!isSupabaseConfigured()) return { userId: null, required: false }
      const { data } = await supabase().auth.getSession()
      return { userId: data.session?.user.id ?? null, required: true }
    },
  })
}

export async function requestCode(email: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({
    email,
    // A first sign-in creates the account, which is the only way anyone gets
    // one — there is no separate sign-up. A mistyped address therefore creates
    // an empty account and no code ever arrives at it, which is the failure
    // mode to watch if abuse becomes a problem.
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

export async function verifyCode(email: string, token: string): Promise<void> {
  const { error } = await supabase().auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return
  await supabase().auth.signOut()
}
