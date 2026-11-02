import { ltr, translate } from '../i18n'
import type { CheckIn, DerivedProfile, Goal, Locale, TrendLine } from '../types'
import { bmi } from './nutrition'

/**
 * Loop three: the 6-8 week decision. Loop one adjusts a session and loop two
 * adjusts a week; neither can ever conclude that the goal itself was wrong.
 * That is the only question this one asks.
 */
export type PhaseDecision = 'TOO_EARLY' | 'CONTINUE' | 'CHANGE_GOAL' | 'MAINTAIN_BREAK'

export const MIN_PHASE_WEEKS = 6
export const MAX_PHASE_WEEKS = 8
/** Cumulative loss past which a maintenance block beats another deficit week. */
export const DIET_BREAK_LOSS_FRACTION = 0.08
export const DIET_BREAK_BMI = 20
export const LOW_ADHERENCE = 0.5

export interface PhaseInput {
  profile: DerivedProfile
  /** Completed sessions per week, oldest first, one entry per week of the phase. */
  sessionsPerWeek: number[]
  plannedPerWeek: number
  /** Every weigh-in of the phase, oldest first. */
  weightsKg: number[]
  checkIns: CheckIn[]
}

export interface ReportLine {
  key: string
  label: { ar: string; en: string }
  value: string
  /**
   * Translation key for the unit, resolved wherever the line is rendered. The
   * value stays a bare number because "3.85 kg" baked in here would print an
   * English unit inside an Arabic report.
   */
  unitKey?: string
}

export interface PhaseReview {
  decision: PhaseDecision
  weeks: number
  adherence: number
  totalChangeKg: number | null
  /** Set only when the decision is CHANGE_GOAL or MAINTAIN_BREAK. */
  suggestedGoal: Goal | null
  headline: { ar: string; en: string }
  detail: { ar: string; en: string }
  report: ReportLine[]
}

function round(n: number, digits = 1): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Average of the first and last three weigh-ins rather than the raw endpoints.
 * A phase verdict that a single dehydrated morning can flip is not a verdict.
 */
export function phaseChangeKg(weights: readonly number[]): number | null {
  const line = phaseLine(weights)
  return line === null ? null : round(line.to.kg - line.from.kg, 2)
}

/**
 * The phase review's line: from the mean of the first window to the mean of the
 * last, each placed at its window's centre. Not a fitted trend — this is the
 * comparison the verdict is made on, so it is the one a chart should show.
 */
export function phaseLine(weights: readonly number[]): TrendLine | null {
  if (weights.length < 4) return null
  const window = Math.min(3, Math.floor(weights.length / 2))
  const centre = (window - 1) / 2
  return {
    from: { at: centre, kg: mean(weights.slice(0, window)) },
    to: { at: weights.length - 1 - centre, kg: mean(weights.slice(-window)) },
  }
}

/** Never proposes a goal the safety gate would then refuse to build. */
function safeGoalFor(profile: DerivedProfile, currentWeightKg: number, wanted: Goal): Goal {
  if (wanted !== 'cut') return wanted
  return bmi(currentWeightKg, profile.heightCm) < 18.5 ? 'gain' : 'cut'
}

export function reviewPhase(input: PhaseInput): PhaseReview {
  const { profile, sessionsPerWeek, plannedPerWeek, weightsKg, checkIns } = input
  const weeks = sessionsPerWeek.length
  const planned = plannedPerWeek * weeks
  const adherence = planned > 0 ? Math.min(1, sessionsPerWeek.reduce((a, b) => a + b, 0) / planned) : 0
  const totalChangeKg = phaseChangeKg(weightsKg)
  const currentWeightKg = weightsKg.at(-1) ?? profile.weightKg
  const startWeightKg = weightsKg[0] ?? profile.weightKg
  const currentBmi = bmi(currentWeightKg, profile.heightCm)

  const report: ReportLine[] = [
    {
      // The unit sits in the label rather than after the number: Arabic agrees
      // its plural with the count (3-10 take أسابيع, 11+ takes أسبوع), and a
      // report column header sidesteps the agreement entirely.
      key: 'weeks',
      label: { ar: 'مدة المرحلة (أسابيع)', en: 'Phase length (weeks)' },
      value: `${weeks}`,
    },
    {
      key: 'adherence',
      label: { ar: 'الالتزام', en: 'Adherence' },
      value: `${Math.round(adherence * 100)}%`,
    },
    {
      key: 'sessions',
      label: { ar: 'تمارين مكتملة', en: 'Sessions completed' },
      value: `${sessionsPerWeek.reduce((a, b) => a + b, 0)} / ${planned}`,
    },
    {
      key: 'weight',
      label: { ar: 'تغيّر الوزن', en: 'Weight change' },
      value: totalChangeKg === null ? '—' : `${totalChangeKg > 0 ? '+' : ''}${totalChangeKg}`,
      ...(totalChangeKg === null ? {} : { unitKey: 'common.kg' }),
    },
    {
      key: 'bmi',
      label: { ar: 'مؤشر الكتلة', en: 'BMI' },
      value: `${currentBmi}`,
    },
    {
      key: 'energy',
      label: { ar: 'متوسط الطاقة', en: 'Average energy' },
      value: checkIns.length === 0 ? '—' : `${round(mean(checkIns.map((c) => c.energy)))} / 5`,
    },
  ]

  const build = (
    decision: PhaseDecision,
    suggestedGoal: Goal | null,
    headline: { ar: string; en: string },
    detail: { ar: string; en: string },
  ): PhaseReview => ({
    decision,
    weeks,
    adherence,
    totalChangeKg,
    suggestedGoal,
    headline,
    detail,
    report,
  })

  if (weeks < MIN_PHASE_WEEKS) {
    return build(
      'TOO_EARLY',
      null,
      { ar: 'بدري على المراجعة', en: 'Too early to call it' },
      {
        ar: `مرّ ${weeks} من ${MIN_PHASE_WEEKS} أسابيع. المرحلة تحتاج وقت قبل ما نحكم عليها.`,
        en: `${weeks} of ${MIN_PHASE_WEEKS} weeks in. A phase needs time before it can be judged.`,
      },
    )
  }

  // 1 — Safety before progress. A long deficit that has taken a lot of weight
  // off, or brought BMI down near the floor, ends in maintenance regardless of
  // how well it was going.
  if (profile.goal === 'cut' && totalChangeKg !== null) {
    const lostFraction = (startWeightKg - currentWeightKg) / startWeightKg
    if (lostFraction >= DIET_BREAK_LOSS_FRACTION || currentBmi <= DIET_BREAK_BMI) {
      return build(
        'MAINTAIN_BREAK',
        'recomp',
        { ar: 'وقت نوقف التنشيف', en: 'Time to stop cutting' },
        {
          ar: `نزلت ${Math.abs(totalChangeKg)} كجم في ${weeks} أسابيع. الجسم يحتاج فترة تثبيت قبل أي تنشيف جديد — هذي مو خطوة للخلف، هذي اللي تخلّي النتيجة تثبت.`,
          en: `Down ${Math.abs(totalChangeKg)} kg over ${weeks} weeks. Your body needs a maintenance block before another deficit — this is not a step back, it is what makes the result hold.`,
        },
      )
    }
  }

  // 2 — A plan that is not being followed is the wrong plan, whatever the
  // scale says. Changing the goal is cheaper than changing the person.
  if (adherence < LOW_ADHERENCE) {
    const suggested = safeGoalFor(profile, currentWeightKg, 'recomp')
    return build(
      'CHANGE_GOAL',
      suggested,
      { ar: 'نغيّر الهدف', en: 'Change the goal' },
      {
        ar: `كمّلت ${Math.round(adherence * 100)}% من تمارين المرحلة. الخطة صعبة عليك مو أنت مقصّر — نقترح هدف أخف تقدر تلتزم فيه.`,
        en: `You completed ${Math.round(adherence * 100)}% of the phase. That is the plan being too much, not you falling short — a lighter goal you can hold is the better one.`,
      },
    )
  }

  // 3 — Adherent and moving. Keep going.
  return build(
    'CONTINUE',
    null,
    { ar: 'نكمل', en: 'Keep going' },
    {
      ar:
        totalChangeKg === null
          ? `كمّلت ${Math.round(adherence * 100)}% من تمارين المرحلة. الالتزام ممتاز — سجّل وزنك أكثر المرحلة الجاية عشان نقيس الاتجاه.`
          : `${weeks} أسابيع، التزام ${Math.round(adherence * 100)}%، والوزن ${totalChangeKg < 0 ? 'نزل' : 'زاد'} ${Math.abs(totalChangeKg)} كجم. الاتجاه صحيح ونكمل على نفس الهدف.`,
      en:
        totalChangeKg === null
          ? `You completed ${Math.round(adherence * 100)}% of the phase. Strong adherence — weigh in more often next phase so we can read the trend.`
          : `${weeks} weeks, ${Math.round(adherence * 100)}% adherence, weight ${totalChangeKg < 0 ? 'down' : 'up'} ${Math.abs(totalChangeKg)} kg. The trend is right; the goal stays.`,
    },
  )
}

/** Resolves a line's unit in the reader's language, or nothing when it has none. */
export function reportValue(line: ReportLine, locale: Locale): string {
  const value = ltr(line.value)
  return line.unitKey ? `${value} ${translate(locale, line.unitKey)}` : value
}

/** Plain text, because the point is that it can leave the app. */
export function shareText(review: PhaseReview, locale: Locale): string {
  const title = locale === 'ar' ? 'تقرير مرحلة — Peak Fitness' : 'Phase report — Peak Fitness'
  const lines = review.report.map((line) => `${line.label[locale]}: ${reportValue(line, locale)}`)
  return [title, '', ...lines, '', review.headline[locale], review.detail[locale]].join('\n')
}
