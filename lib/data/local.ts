import type { Correction } from '../nutrition/memory'
import type { CheckIn, MealLogEntry, Plan, Profile } from '../types'
import { kv, readJson, writeJson, type Kv } from './kv'
import { newId, type ConsentKind, type RejectionRecord, type Repo, type SessionLog, type WeightEntry } from './repo'

const KEYS = {
  profile: 'profile',
  consents: 'consents',
  plans: 'plans',
  checkIns: 'checkIns',
  weights: 'weights',
  sessions: 'sessions',
  meals: 'meals',
  corrections: 'corrections',
  rejections: 'rejections',
} as const

const DEFAULT_CONSENTS: Record<ConsentKind, boolean> = {
  processing: false,
  cross_border_transfer: false,
}

/**
 * Runs the whole app against browser storage. Real enough to use, and the only
 * driver that never sends anything anywhere — which makes it the honest default
 * before a backend region has been chosen and documented.
 */
export function localRepo(store: Kv = kv): Repo {
  const read = <T>(key: string, fallback: T) => readJson(store, key, fallback)
  const write = (key: string, value: unknown) => writeJson(store, key, value)

  return {
    kind: 'local',

    async getProfile() {
      return read<Profile | null>(KEYS.profile, null)
    },
    async saveProfile(profile) {
      write(KEYS.profile, profile)
    },

    async getConsents() {
      return { ...DEFAULT_CONSENTS, ...read(KEYS.consents, {}) }
    },
    async setConsent(kind, granted) {
      write(KEYS.consents, { ...(await this.getConsents()), [kind]: granted })
    },

    async getPlan(weekIndex) {
      return read<Plan[]>(KEYS.plans, []).find((p) => p.weekIndex === weekIndex) ?? null
    },
    async latestPlan() {
      const plans = read<Plan[]>(KEYS.plans, [])
      return plans.reduce<Plan | null>((a, b) => (a && a.weekIndex > b.weekIndex ? a : b), null)
    },
    async savePlan(plan) {
      const plans = read<Plan[]>(KEYS.plans, []).filter((p) => p.weekIndex !== plan.weekIndex)
      write(KEYS.plans, [...plans, plan])
    },

    async getCheckIn(day) {
      return read<CheckIn[]>(KEYS.checkIns, []).find((c) => c.date === day) ?? null
    },
    async saveCheckIn(checkIn) {
      const rest = read<CheckIn[]>(KEYS.checkIns, []).filter((c) => c.date !== checkIn.date)
      write(KEYS.checkIns, [...rest, checkIn].sort((a, b) => a.date.localeCompare(b.date)))
    },
    async listCheckIns(limit = 30) {
      return read<CheckIn[]>(KEYS.checkIns, []).slice(-limit)
    },

    async addWeight(entry) {
      const rest = read<WeightEntry[]>(KEYS.weights, []).filter((w) => w.day !== entry.day)
      write(KEYS.weights, [...rest, entry].sort((a, b) => a.day.localeCompare(b.day)))
    },
    async listWeights(limit = 30) {
      return read<WeightEntry[]>(KEYS.weights, []).slice(-limit)
    },

    async logSession(log) {
      write(KEYS.sessions, [...read<SessionLog[]>(KEYS.sessions, []), { ...log, id: newId() }])
    },
    async listSessions(sinceIso) {
      return read<SessionLog[]>(KEYS.sessions, []).filter((s) => s.completedAt >= sinceIso)
    },

    async listMeals(day) {
      return read<MealLogEntry[]>(KEYS.meals, []).filter((m) => m.loggedAt.slice(0, 10) === day)
    },
    async addMeal(entry) {
      write(KEYS.meals, [...read<MealLogEntry[]>(KEYS.meals, []), entry])
    },
    async updateMeal(id, patch) {
      write(
        KEYS.meals,
        read<MealLogEntry[]>(KEYS.meals, []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
      )
    },

    async addCorrection(correction) {
      write(KEYS.corrections, [...read<Correction[]>(KEYS.corrections, []), correction])
    },
    async listCorrections() {
      return read<Correction[]>(KEYS.corrections, [])
    },

    async logRejection(record) {
      const all = read<(RejectionRecord & { at: string })[]>(KEYS.rejections, [])
      write(KEYS.rejections, [...all, { ...record, at: new Date().toISOString() }])
    },

    async deleteEverything() {
      for (const key of Object.values(KEYS)) store.remove(key)
    },
  }
}
