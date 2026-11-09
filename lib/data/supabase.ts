import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import type { Correction } from '../nutrition/memory'
import type { CheckIn, MealLogEntry, Plan, Profile } from '../types'
import { newId, type ConsentKind, type RejectionRecord, type Repo, type SessionLog, type WeightEntry } from './repo'

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
/**
 * Documented in the privacy screen, so it is configuration, not a constant.
 * `||`, not `??`, here and for the policy version: a deploy variable created
 * blank is no setting. Shown blank, the region would tell people their data
 * lives nowhere; stored blank, a consent record would name no policy at all.
 */
export const SUPABASE_REGION = process.env.EXPO_PUBLIC_SUPABASE_REGION || 'eu-central-1'

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
}

/**
 * Sessions go to the keychain, not AsyncStorage — an auth token in plain
 * app storage is readable by anything that can read the app's sandbox. On the
 * web there is no keychain, so the SDK's own storage is used.
 */
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        ...(Platform.OS === 'web' ? {} : { storage: secureStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  }
  return client
}

async function userId(): Promise<string> {
  const { data } = await supabase().auth.getUser()
  if (!data.user) throw new Error('not authenticated')
  return data.user.id
}

const rowToProfile = (row: Record<string, any>): Profile => ({
  age: row.age,
  sex: row.sex,
  heightCm: row.height_cm,
  weightKg: Number(row.weight_kg),
  goal: row.goal,
  activity: row.activity,
  daysPerWeek: row.days_per_week,
  equipment: row.equipment,
  injuries: row.injuries,
  allergies: row.allergies,
  dietary: row.dietary,
  locale: row.locale,
})

export function supabaseRepo(): Repo {
  const db = () => supabase()

  return {
    kind: 'supabase',

    async getProfile() {
      const { data } = await db().from('profiles').select('*').maybeSingle()
      return data ? rowToProfile(data) : null
    },
    async saveProfile(profile) {
      await db()
        .from('profiles')
        .upsert({
          user_id: await userId(),
          age: profile.age,
          sex: profile.sex,
          height_cm: profile.heightCm,
          weight_kg: profile.weightKg,
          goal: profile.goal,
          activity: profile.activity,
          days_per_week: profile.daysPerWeek,
          equipment: profile.equipment,
          injuries: profile.injuries,
          allergies: profile.allergies,
          dietary: profile.dietary,
          locale: profile.locale,
        })
    },

    async getConsents() {
      const { data } = await db()
        .from('consents')
        .select('kind, granted, decided_at')
        .order('decided_at', { ascending: false })
      const out: Record<ConsentKind, boolean> = { processing: false, cross_border_transfer: false }
      // Ordered newest first, so the first mention of each kind is current.
      for (const row of data ?? []) {
        const kind = row.kind as ConsentKind
        if (!(kind in out) || out[kind]) continue
        out[kind] = row.granted
      }
      return out
    },
    async setConsent(kind, granted) {
      await db().from('consents').insert({
        user_id: await userId(),
        kind,
        granted,
        policy_version: process.env.EXPO_PUBLIC_POLICY_VERSION || '2026-08-01',
      })
    },

    async getPlan(weekIndex) {
      const { data } = await db().from('plans').select('payload').eq('week_index', weekIndex).maybeSingle()
      return (data?.payload as Plan) ?? null
    },
    async latestPlan() {
      const { data } = await db()
        .from('plans').select('payload').order('week_index', { ascending: false }).limit(1).maybeSingle()
      return (data?.payload as Plan) ?? null
    },
    async savePlan(plan) {
      await db().from('plans').upsert(
        { user_id: await userId(), week_index: plan.weekIndex, source: plan.source, payload: plan },
        { onConflict: 'user_id,week_index' },
      )
    },

    async getCheckIn(day) {
      const { data } = await db().from('check_ins').select('*').eq('day', day).maybeSingle()
      if (!data) return null
      return {
        date: data.day,
        sleepHours: Number(data.sleep_hours),
        energy: data.energy,
        soreness: data.soreness,
        stress: data.stress,
        minutesAvailable: data.minutes_available,
      }
    },
    async saveCheckIn(checkIn) {
      await db().from('check_ins').upsert(
        {
          user_id: await userId(),
          day: checkIn.date,
          sleep_hours: checkIn.sleepHours,
          energy: checkIn.energy,
          soreness: checkIn.soreness,
          stress: checkIn.stress,
          minutes_available: checkIn.minutesAvailable,
        },
        { onConflict: 'user_id,day' },
      )
    },
    async listCheckIns(limit = 30) {
      const { data } = await db().from('check_ins').select('*').order('day', { ascending: false }).limit(limit)
      return (data ?? [])
        .map((row): CheckIn => ({
          date: row.day,
          sleepHours: Number(row.sleep_hours),
          energy: row.energy,
          soreness: row.soreness,
          stress: row.stress,
          minutesAvailable: row.minutes_available,
        }))
        .reverse()
    },

    async addWeight(entry) {
      await db().from('weights').upsert(
        { user_id: await userId(), day: entry.day, weight_kg: entry.weightKg },
        { onConflict: 'user_id,day' },
      )
    },
    async listWeights(limit = 30) {
      const { data } = await db().from('weights').select('*').order('day', { ascending: false }).limit(limit)
      return (data ?? []).map((r): WeightEntry => ({ day: r.day, weightKg: Number(r.weight_kg) })).reverse()
    },

    async logSession(log) {
      await db().from('session_logs').insert({
        user_id: await userId(),
        plan_id: log.planId,
        day_id: log.dayId,
        completed_at: log.completedAt,
        sets_done: log.setsDone,
      })
    },
    async listSessions(sinceIso) {
      const { data } = await db().from('session_logs').select('*').gte('completed_at', sinceIso)
      return (data ?? []).map((r): SessionLog => ({
        id: r.id, planId: r.plan_id, dayId: r.day_id, completedAt: r.completed_at, setsDone: r.sets_done,
      }))
    },

    async listMeals(day) {
      const { data } = await db()
        .from('meal_logs').select('*')
        .gte('logged_at', `${day}T00:00:00Z`).lte('logged_at', `${day}T23:59:59Z`)
        .order('logged_at')
      return (data ?? []).map((r): MealLogEntry => ({
        id: r.id, loggedAt: r.logged_at, dishId: r.dish_key, label: r.label,
        cookMethod: r.cook_method, portion: r.portion, estimate: r.estimate,
        status: r.status, correctedKcal: r.corrected_kcal ?? undefined,
      }))
    },
    async addMeal(entry) {
      await db().from('meal_logs').insert({
        id: entry.id, user_id: await userId(), logged_at: entry.loggedAt,
        dish_key: entry.dishId, label: entry.label, cook_method: entry.cookMethod,
        portion: entry.portion, estimate: entry.estimate, status: entry.status,
      })
    },
    async updateMeal(id, patch) {
      await db().from('meal_logs').update({
        ...(patch.cookMethod !== undefined && { cook_method: patch.cookMethod }),
        ...(patch.portion !== undefined && { portion: patch.portion }),
        ...(patch.estimate !== undefined && { estimate: patch.estimate }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.correctedKcal !== undefined && { corrected_kcal: patch.correctedKcal }),
      }).eq('id', id)
    },

    async addCorrection(correction) {
      await db().from('dish_corrections').insert({
        user_id: await userId(), dish_key: correction.dishKey, kcal: correction.kcal,
        portion: correction.portion, cook_method: correction.cookMethod,
        city: correction.city, corrected_at: correction.correctedAt,
      })
    },
    async listCorrections() {
      const { data } = await db().from('dish_corrections').select('*')
      return (data ?? []).map((r): Correction => ({
        dishKey: r.dish_key, kcal: r.kcal, portion: r.portion,
        cookMethod: r.cook_method, city: r.city, correctedAt: r.corrected_at,
      }))
    },

    async logRejection(record) {
      await db().from('safety_rejections').insert({
        user_id: await userId(), verdict: record.verdict, code: record.code,
        allergen: record.allergen ?? null, match_kind: record.matchKind ?? null,
        term: record.term ?? null, attempt: record.attempt, plan_source: record.planSource,
      })
    },

    async deleteEverything() {
      // One transaction on the server rather than a client-side loop that can
      // be interrupted halfway through and leave data behind.
      const { error } = await db().rpc('delete_all_my_data')
      if (error) throw error
      await db().auth.signOut()
    },
  }
}

export { newId }
