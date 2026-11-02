import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { translate } from '../i18n'
import { notifyIfAway } from '../notifications'
import { adapt, type Adaptation } from '../plan/adapt'
import { producePlan, type PlanOutcome } from '../plan/generate'
import { deriveProfile } from '../plan/nutrition'
import { reviewPhase, type PhaseReview } from '../plan/phase'
import { reviewWeek, type WeeklyReview } from '../plan/weekly'
import type { CheckIn, DerivedProfile, MealLogEntry, Plan, Profile, WorkoutDay } from '../types'
import { useSettings } from '../store/settings'
import { repo, today, type ConsentKind, type WeightEntry } from './index'
import { requestModelPlan } from './edge'

export const keys = {
  profile: ['profile'] as const,
  consents: ['consents'] as const,
  plan: ['plan'] as const,
  checkIn: (day: string) => ['checkIn', day] as const,
  checkIns: ['checkIns'] as const,
  weights: ['weights'] as const,
  sessions: ['sessions'] as const,
  meals: (day: string) => ['meals', day] as const,
  corrections: ['corrections'] as const,
}

export function useProfile(options: { enabled?: boolean } = {}): UseQueryResult<Profile | null> {
  return useQuery({
    queryKey: keys.profile,
    queryFn: () => repo().getProfile(),
    // The entry gate switches this off while signed out: a profile read that
    // RLS will refuse anyway costs a retry cycle the user waits through.
    enabled: options.enabled ?? true,
  })
}

export function useDerivedProfile(): DerivedProfile | null {
  const { data } = useProfile()
  return data ? deriveProfile(data) : null
}

export function useSaveProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (profile: Profile) => repo().saveProfile(profile),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.profile }),
  })
}

export function useConsents() {
  return useQuery({ queryKey: keys.consents, queryFn: () => repo().getConsents() })
}

export function useSetConsent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, granted }: { kind: ConsentKind; granted: boolean }) =>
      repo().setConsent(kind, granted),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.consents }),
  })
}

export function usePlan(): UseQueryResult<Plan | null> {
  return useQuery({ queryKey: keys.plan, queryFn: () => repo().latestPlan() })
}

/**
 * Plan generation is a mutation the user can walk away from. Nothing in the UI
 * awaits it inline — the generating screen watches the query cache and the user
 * is free to leave.
 */
export function useGeneratePlan() {
  const qc = useQueryClient()
  return useMutation<PlanOutcome, Error, { profile: DerivedProfile; weekIndex?: number }>({
    mutationFn: async ({ profile, weekIndex = 0 }) =>
      producePlan({
        repo: repo(),
        profile,
        weekIndex,
        fromModel: (p, week) => requestModelPlan(p, week),
      }),
    onSuccess: (outcome) => {
      void qc.invalidateQueries({ queryKey: keys.plan })
      // Generation is a job people are invited to walk away from. This fires
      // only for someone who took that invitation — the tab badge covers
      // anyone still looking at the app.
      if (!outcome.plan) return
      const locale = useSettings.getState().locale
      void notifyIfAway(
        translate(locale, 'notify.planReadyTitle'),
        translate(locale, 'notify.planReadyBody'),
      )
    },
  })
}

export function useCheckIn(day = today()) {
  return useQuery({ queryKey: keys.checkIn(day), queryFn: () => repo().getCheckIn(day) })
}

export function useSaveCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (checkIn: CheckIn) => repo().saveCheckIn(checkIn),
    onSuccess: (_data, checkIn) => {
      void qc.invalidateQueries({ queryKey: keys.checkIn(checkIn.date) })
      void qc.invalidateQueries({ queryKey: keys.checkIns })
    },
  })
}

/** Which day of the plan today is, by how many sessions are already logged. */
export function useTodayDay(plan: Plan | null | undefined, completed: number): WorkoutDay | null {
  if (!plan || plan.days.length === 0) return null
  return plan.days[completed % plan.days.length] ?? null
}

export function useAdaptedDay(day: WorkoutDay | null, checkIn: CheckIn | null | undefined): Adaptation | null {
  if (!day || !checkIn) return null
  return adapt(day, checkIn)
}

export function useWeights() {
  return useQuery({ queryKey: keys.weights, queryFn: () => repo().listWeights() })
}

export function useAddWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entry: WeightEntry) => repo().addWeight(entry),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.weights })
      // Both reviews are computed from the weigh-ins, but their keys do not
      // name them — a new reading left a cached review standing on old data.
      void qc.invalidateQueries({ queryKey: ['weeklyReview'] })
      void qc.invalidateQueries({ queryKey: ['phaseReview'] })
    },
  })
}

function startOfWeekIso(): string {
  const now = new Date()
  now.setDate(now.getDate() - 7)
  return now.toISOString()
}

export function useSessionsThisWeek() {
  return useQuery({ queryKey: keys.sessions, queryFn: () => repo().listSessions(startOfWeekIso()) })
}

export function useLogSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (log: { planId: string; dayId: string; setsDone: number }) =>
      repo().logSession({ ...log, completedAt: new Date().toISOString() }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.sessions }),
  })
}

export function useMeals(day = today()) {
  return useQuery({ queryKey: keys.meals(day), queryFn: () => repo().listMeals(day) })
}

export function useAddMeal(day = today()) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entry: MealLogEntry) => repo().addMeal(entry),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.meals(day) }),
  })
}

export function useUpdateMeal(day = today()) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<MealLogEntry> }) =>
      repo().updateMeal(id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.meals(day) }),
  })
}

export function useCorrections() {
  return useQuery({ queryKey: keys.corrections, queryFn: () => repo().listCorrections() })
}

export function useAddCorrection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: repo().addCorrection.bind(repo()),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.corrections }),
  })
}

export function useWeeklyReview(profile: DerivedProfile | null): UseQueryResult<WeeklyReview | null> {
  return useQuery({
    queryKey: ['weeklyReview', profile?.weightKg, profile?.goal],
    enabled: profile !== null,
    queryFn: async () => {
      if (!profile) return null
      const plan = await repo().latestPlan()
      const sessions = await repo().listSessions(startOfWeekIso())
      const weights = await repo().listWeights(14)
      return reviewWeek(profile, {
        weekIndex: plan?.weekIndex ?? 0,
        sessionsPlanned: plan?.days.length ?? profile.daysPerWeek,
        sessionsCompleted: sessions.length,
        checkIns: await repo().listCheckIns(7),
        weightsKg: weights.map((w) => w.weightKg),
      })
    },
  })
}

/**
 * Loop three. Sessions are bucketed into weeks by how long ago they were
 * logged, so a phase can be reviewed from the same logs the other two loops
 * already write — there is no separate phase record to fall out of sync.
 */
export function usePhaseReview(profile: DerivedProfile | null): UseQueryResult<PhaseReview | null> {
  return useQuery({
    queryKey: ['phaseReview', profile?.goal, profile?.weightKg],
    enabled: profile !== null,
    queryFn: async () => {
      if (!profile) return null
      const plan = await repo().latestPlan()
      const weeks = Math.max(1, (plan?.weekIndex ?? 0) + 1)
      const since = new Date()
      since.setDate(since.getDate() - weeks * 7)

      const sessions = await repo().listSessions(since.toISOString())
      const perWeek = Array.from({ length: weeks }, () => 0)
      for (const session of sessions) {
        const ageDays = (Date.now() - Date.parse(session.completedAt)) / 86_400_000
        const bucket = weeks - 1 - Math.floor(ageDays / 7)
        if (bucket >= 0 && bucket < weeks) perWeek[bucket] = (perWeek[bucket] ?? 0) + 1
      }

      return reviewPhase({
        profile,
        sessionsPerWeek: perWeek,
        plannedPerWeek: plan?.days.length ?? profile.daysPerWeek,
        weightsKg: (await repo().listWeights(60)).map((w) => w.weightKg),
        checkIns: await repo().listCheckIns(60),
      })
    },
  })
}

export function useDeleteEverything() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => repo().deleteEverything(),
    onSuccess: () => void qc.clear(),
  })
}
