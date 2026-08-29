import { toModelSafe } from '../privacy/modelSafe'
import type { DerivedProfile, Plan } from '../types'
import { repo } from './index'
import { isSupabaseConfigured, supabase } from './supabase'

/**
 * Calls the edge function that owns the model key. Returns null whenever the
 * model is not reachable, not consented to, or not configured — the caller's
 * job is to ship the rules-based plan, not to show an error.
 */
export async function requestModelPlan(
  profile: DerivedProfile,
  weekIndex: number,
): Promise<Plan | null> {
  if (!isSupabaseConfigured()) return null

  const consents = await repo().getConsents()
  if (!consents.cross_border_transfer) return null

  const { data, error } = await supabase().functions.invoke('generate-plan', {
    // Sent through the allowlist even though the function re-filters: the
    // payload that leaves this device is the one that matters.
    body: { weekIndex, profile: toModelSafe(profile as unknown as Record<string, unknown>) },
  })
  if (error || !data?.plan) return null
  return data.plan as Plan
}

export interface PhotoEstimateBase {
  label: string
  labelEn: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  ingredients: string[]
  looksFried: boolean
}

export async function analyzeMealPhoto(
  imageBase64: string,
  mediaType = 'image/jpeg',
): Promise<PhotoEstimateBase | null> {
  if (!isSupabaseConfigured()) return null
  const consents = await repo().getConsents()
  if (!consents.cross_border_transfer) return null

  const { data, error } = await supabase().functions.invoke('analyze-meal', {
    body: { imageBase64, mediaType },
  })
  if (error || !data?.base) return null
  return data.base as PhotoEstimateBase
}
