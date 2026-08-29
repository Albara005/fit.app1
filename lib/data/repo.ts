import type { AllergenId } from '../safety/allergens'
import type { GateReason, Verdict } from '../safety/gate'
import type { Correction } from '../nutrition/memory'
import type { CheckIn, MealLogEntry, Plan, Profile } from '../types'

export type ConsentKind = 'processing' | 'cross_border_transfer'

export interface WeightEntry {
  day: string
  weightKg: number
}

export interface SessionLog {
  id: string
  planId: string
  dayId: string
  completedAt: string
  setsDone: number
}

export interface RejectionRecord {
  verdict: Verdict
  code: GateReason['code']
  allergen?: AllergenId
  matchKind?: string
  term?: string
  attempt: number
  planSource: Plan['source']
}

/**
 * Everything the app needs from storage. Two drivers implement it: a local one
 * that runs with no backend at all, and Supabase. Screens never learn which.
 */
export interface Repo {
  readonly kind: 'local' | 'supabase'

  getProfile(): Promise<Profile | null>
  saveProfile(profile: Profile): Promise<void>

  getConsents(): Promise<Record<ConsentKind, boolean>>
  setConsent(kind: ConsentKind, granted: boolean): Promise<void>

  getPlan(weekIndex: number): Promise<Plan | null>
  latestPlan(): Promise<Plan | null>
  savePlan(plan: Plan): Promise<void>

  getCheckIn(day: string): Promise<CheckIn | null>
  saveCheckIn(checkIn: CheckIn): Promise<void>
  listCheckIns(limit?: number): Promise<CheckIn[]>

  addWeight(entry: WeightEntry): Promise<void>
  listWeights(limit?: number): Promise<WeightEntry[]>

  logSession(log: Omit<SessionLog, 'id'>): Promise<void>
  listSessions(sinceIso: string): Promise<SessionLog[]>

  listMeals(day: string): Promise<MealLogEntry[]>
  addMeal(entry: MealLogEntry): Promise<void>
  updateMeal(id: string, patch: Partial<MealLogEntry>): Promise<void>

  addCorrection(correction: Correction): Promise<void>
  listCorrections(): Promise<Correction[]>

  logRejection(record: RejectionRecord): Promise<void>

  /** Must actually clear everything. The privacy screen promises it. */
  deleteEverything(): Promise<void>
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
