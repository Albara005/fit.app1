import { KCAL_FLOOR, MAX_DEFICIT_FRACTION } from '../safety/gate'
import type { CheckIn, DerivedProfile, NutritionTarget, Plan, TrendLine } from '../types'
import { buildTemplatePlan } from './engine'

/**
 * Arabic does not count as "N + plural": one and two have forms of their own,
 * and "2 أيام" reads as a mistake — in the very case low adherence produces,
 * a three-day week cut to two. Three to ten take the plural.
 */
function daysAr(n: number): string {
  if (n === 1) return 'يوم واحد'
  if (n === 2) return 'يومين'
  return `${n} أيام`
}

export interface WeekLog {
  weekIndex: number
  sessionsPlanned: number
  sessionsCompleted: number
  checkIns: CheckIn[]
  /** Ordered oldest to newest. */
  weightsKg: number[]
}

export type ReviewCode =
  | 'LOW_ADHERENCE'
  | 'STRONG_ADHERENCE'
  | 'STALLED'
  | 'LOSING_TOO_FAST'
  | 'ON_TRACK'
  | 'NOT_ENOUGH_DATA'

export interface ReviewCard {
  key: 'happened' | 'changed' | 'new'
  title: { ar: string; en: string }
  body: { ar: string; en: string }
}

export interface WeeklyReview {
  codes: ReviewCode[]
  adherence: number
  weeklyChangeKg: number | null
  nextProfile: DerivedProfile
  nextPlan: Plan
  cards: ReviewCard[]
}

/**
 * The least-squares line through the readings, by reading order. Exported so
 * the chart draws the very line this review decides from — a chart fitted
 * separately could show a trend the coach did not act on.
 */
export function trendFit(weights: readonly number[]): { intercept: number; slope: number } | null {
  if (weights.length < 3) return null
  const n = weights.length
  const meanX = (n - 1) / 2
  const meanY = weights.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (const [i, y] of weights.entries()) {
    num += (i - meanX) * (y - meanY)
    den += (i - meanX) ** 2
  }
  if (den === 0) return null
  const slope = num / den
  return { intercept: meanY - slope * meanX, slope }
}

/** The weekly review's line: the least-squares fit, across the readings it saw. */
export function weeklyLine(weights: readonly number[]): TrendLine | null {
  const fit = trendFit(weights)
  if (fit === null) return null
  const last = weights.length - 1
  return { from: { at: 0, kg: fit.intercept }, to: { at: last, kg: fit.intercept + fit.slope * last } }
}

/**
 * Least-squares fit over the week's weigh-ins, returned as the change across
 * the whole span. Two things this gets right that the obvious version does not:
 * a first-to-last subtraction reads a single day's water weight as progress,
 * and scaling a per-reading slope by 7 assumes daily weigh-ins that nobody
 * actually does.
 */
export function weightTrend(weights: readonly number[]): number | null {
  const line = weeklyLine(weights)
  return line === null ? null : line.to.kg - line.from.kg
}

function adjustNutrition(
  target: NutritionTarget,
  profile: DerivedProfile,
  factor: number,
): NutritionTarget {
  const floor = KCAL_FLOOR[profile.sex]
  const maxDeficit = MAX_DEFICIT_FRACTION * profile.tdee
  const kcal = Math.max(floor, Math.round(target.kcal * factor))
  const deficit = Math.min(maxDeficit, profile.tdee - kcal)
  return {
    ...target,
    kcal: Math.round(profile.tdee - deficit),
    deficit: Math.round(deficit),
    weeklyLossTargetKg: deficit > 0 ? Math.round(((deficit * 7) / 7700) * 100) / 100 : 0,
  }
}

/**
 * Loop two. Two minutes of the user's attention buys a week that answers to
 * what actually happened, not to what the onboarding form guessed.
 */
export function reviewWeek(profile: DerivedProfile, log: WeekLog): WeeklyReview {
  const codes: ReviewCode[] = []
  const adherence = log.sessionsPlanned > 0 ? log.sessionsCompleted / log.sessionsPlanned : 0
  const trend = weightTrend(log.weightsKg)
  const next = { ...profile }

  if (adherence < 0.5) {
    codes.push('LOW_ADHERENCE')
    // Asking for the same week again after a missed one is how apps get deleted.
    next.daysPerWeek = Math.max(2, profile.daysPerWeek - 1)
  } else if (adherence >= 0.8) {
    codes.push('STRONG_ADHERENCE')
  }

  if (trend === null) {
    codes.push('NOT_ENOUGH_DATA')
  } else if (profile.goal === 'cut') {
    const targetLoss = -0.0075 * profile.weightKg
    if (trend > targetLoss * 0.25) codes.push('STALLED')
    else if (trend < targetLoss * 2) codes.push('LOSING_TOO_FAST')
    else codes.push('ON_TRACK')
  } else {
    codes.push('ON_TRACK')
  }

  const latest = log.weightsKg.at(-1)
  if (latest !== undefined) next.weightKg = latest

  const weekIndex = log.weekIndex + 1
  let plan = buildTemplatePlan(next, weekIndex)
  if (codes.includes('STALLED')) {
    plan = { ...plan, nutrition: adjustNutrition(plan.nutrition, next, 0.95) }
  } else if (codes.includes('LOSING_TOO_FAST')) {
    plan = { ...plan, nutrition: adjustNutrition(plan.nutrition, next, 1.07) }
  }
  return {
    codes,
    adherence,
    weeklyChangeKg: trend,
    nextProfile: next,
    nextPlan: plan,
    cards: buildCards(codes, adherence, trend, next, plan),
  }
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function buildCards(
  codes: ReviewCode[],
  adherence: number,
  trend: number | null,
  profile: DerivedProfile,
  plan: Plan,
): ReviewCard[] {
  const done = pct(adherence)
  const kg = trend === null ? null : Math.abs(Math.round(trend * 100) / 100)

  const happened: ReviewCard = {
    key: 'happened',
    title: { ar: 'وش صار', en: 'What happened' },
    body:
      kg === null
        ? {
            ar: `كمّلت ${done} من تمارين الأسبوع. ما عندي وزنات كافية أحسب عليها اتجاه — سجّل وزنك ثلاث مرات الأسبوع الجاي.`,
            en: `You finished ${done} of the week's sessions. Not enough weigh-ins to read a trend — log three next week.`,
          }
        : kg === 0
          ? {
              // A trend that rounds to nothing was announced as "rose by 0 kg" —
              // a sentence no coach says.
              ar: `كمّلت ${done} من تمارين الأسبوع، ووزنك ثابت.`,
              en: `You finished ${done} of the week's sessions, and your weight held steady.`,
            }
          : {
            ar: `كمّلت ${done} من تمارين الأسبوع، ووزنك ${trend! < 0 ? 'نزل' : 'طلع'} ${kg} كجم.`,
            en: `You finished ${done} of the week's sessions, and your weight ${trend! < 0 ? 'fell' : 'rose'} by ${kg} kg.`,
          },
  }

  const changedBody = codes.includes('LOW_ADHERENCE')
    ? {
        // Kept free of its own numbers: the sentence before it already names
        // the real one, and an invented "four beats six" contradicts it.
        ar: `نزّلت الأسبوع إلى ${daysAr(profile.daysPerWeek)}. يوم تكمله أفضل من يومين تفوّتهما.`,
        en: `I cut the week to ${profile.daysPerWeek} ${profile.daysPerWeek === 1 ? 'day' : 'days'}. Days you finish beat days you skip.`,
      }
    : codes.includes('STALLED')
      ? {
          ar: `الوزن ثابت أسبوع كامل، فنزّلت السعرات إلى ${plan.nutrition.kcal} — نزول هادئ لا قفزة.`,
          en: `Weight held flat all week, so calories come down to ${plan.nutrition.kcal} — a nudge, not a cut.`,
        }
      : codes.includes('LOSING_TOO_FAST')
        ? {
            ar: `النزول أسرع من اللازم، فرفعت السعرات إلى ${plan.nutrition.kcal} عشان تحافظ على عضلك.`,
            en: `You are dropping faster than is useful, so calories go up to ${plan.nutrition.kcal} to protect muscle.`,
          }
        : {
            ar: 'ما غيّرت السعرات — الاتجاه صحيح، والأفضل نخلّيه يشتغل أسبوع ثاني.',
            en: 'Calories stay put — the trend is right, and it deserves another week to work.',
          }

  const newBody = codes.includes('STRONG_ADHERENCE')
    ? {
        ar: 'زدت الحجم شوي على التمارين الأساسية. أنت مستمر، فالجسم جاهز لزيادة.',
        en: 'A little more volume on the main lifts. You are showing up, so your body can take it.',
      }
    : {
        ar: 'نفس التمارين بترتيب مختلف — التقدّم يجي من الإتقان لا من التنويع.',
        en: 'Same lifts, reordered — progress comes from repeating them well, not from variety.',
      }

  return [
    happened,
    { key: 'changed', title: { ar: 'وش تغيّر', en: 'What changed' }, body: changedBody },
    { key: 'new', title: { ar: 'وش الجديد', en: "What's new" }, body: newBody },
  ]
}
