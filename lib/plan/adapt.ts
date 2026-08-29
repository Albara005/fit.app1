import type { CheckIn, Locale, WorkoutDay } from '../types'

export type AdaptationCode =
  | 'SLEEP_DEBT'
  | 'LOW_ENERGY'
  | 'HIGH_SORENESS'
  | 'HIGH_STRESS'
  | 'SHORT_ON_TIME'
  | 'GREEN_LIGHT'
  | 'NO_CHANGE'

export interface Adaptation {
  day: WorkoutDay
  codes: AdaptationCode[]
  /** The one line the user actually reads. Never a status message. */
  line: { ar: string; en: string }
  setsDelta: number
  minutesDelta: number
}

const DROP_ONE_SET = (day: WorkoutDay): WorkoutDay => ({
  ...day,
  exercises: day.exercises.map((x) => ({ ...x, sets: Math.max(2, x.sets - 1) })),
})

const EASE_RPE = (day: WorkoutDay, by: number): WorkoutDay => ({
  ...day,
  exercises: day.exercises.map((x) => ({ ...x, rpe: Math.max(5, x.rpe - by) })),
})

function countSets(day: WorkoutDay): number {
  return day.exercises.reduce((n, x) => n + x.sets, 0)
}

function estimate(day: WorkoutDay): number {
  return Math.round(day.exercises.reduce((m, x) => m + x.sets * (x.restSec / 60 + 0.75), 8))
}

/**
 * Trims from the end. The list is ordered heaviest-first, so what goes is
 * always the accessory work, never the session's reason for existing.
 */
function fitToTime(day: WorkoutDay, minutes: number): WorkoutDay {
  let exercises = [...day.exercises]
  while (exercises.length > 2 && estimate({ ...day, exercises }) > minutes) {
    exercises = exercises.slice(0, -1)
  }
  if (estimate({ ...day, exercises }) > minutes) {
    exercises = exercises.map((x) => ({ ...x, restSec: Math.max(45, Math.round(x.restSec * 0.7)) }))
  }
  return { ...day, exercises }
}

const LINES: Record<AdaptationCode, (n: number) => { ar: string; en: string }> = {
  SLEEP_DEBT: (h) => ({
    ar: `نمت ${h} ساعات بس، فخفّفت مجموعة من كل تمرين. النوم جزء من البرنامج مو خارجه.`,
    en: `You slept ${h} hours, so I took a set off each lift. Sleep is part of the programme, not outside it.`,
  }),
  LOW_ENERGY: () => ({
    ar: 'طاقتك اليوم منخفضة، فنزّلت شدة التمرين درجة. تمرين خفيف تكمله أفضل من تمرين ثقيل تتركه.',
    en: 'Your energy is low today, so I eased the intensity. A light session you finish beats a heavy one you abandon.',
  }),
  HIGH_SORENESS: () => ({
    ar: 'لسا فيك ألم من آخر تمرين، فقلّلت الحجم اليوم عشان تتعافى وأنت تتمرن.',
    en: 'You are still sore from last session, so today runs at lower volume — recover while you train.',
  }),
  HIGH_STRESS: () => ({
    ar: 'يومك ضاغط، فخلّيت الشدة أقل. التمرين اليوم يخدم مزاجك أكثر من رقمك.',
    en: 'Stressful day, so intensity is down. Today the session is for your head more than your numbers.',
  }),
  SHORT_ON_TIME: (m) => ({
    ar: `عندك ${m} دقيقة، فرتّبت التمرين على الأساسيات وقصّرت الراحات.`,
    en: `You have ${m} minutes, so I kept the main lifts and shortened the rests.`,
  }),
  GREEN_LIGHT: () => ({
    ar: 'نومك وطاقتك ممتازين، فزدت مجموعة على أول تمرين. اليوم مناسب تدفع فيه.',
    en: 'Sleep and energy both look good, so I added a set to your first lift. Today is a day to push.',
  }),
  NO_CHANGE: () => ({
    ar: 'تمرين اليوم زي ما هو في الخطة — ما فيه شي يستدعي التعديل.',
    en: 'Today runs as planned — nothing in your check-in calls for a change.',
  }),
}

/**
 * Loop one. Ten seconds of input, one adjusted session, and one sentence saying
 * why it changed. The sentence is the product: an adjustment nobody can explain
 * reads as the app being unreliable.
 */
export function adapt(day: WorkoutDay, checkIn: CheckIn): Adaptation {
  const before = countSets(day)
  const beforeMinutes = estimate(day)
  const codes: AdaptationCode[] = []
  let out = day

  if (checkIn.sleepHours < 6) {
    codes.push('SLEEP_DEBT')
    out = DROP_ONE_SET(out)
  }
  if (checkIn.energy <= 2) {
    codes.push('LOW_ENERGY')
    out = EASE_RPE(out, 1)
    if (!codes.includes('SLEEP_DEBT')) out = DROP_ONE_SET(out)
  }
  if (checkIn.soreness >= 4) {
    codes.push('HIGH_SORENESS')
    out = EASE_RPE(out, 1)
  }
  if (checkIn.stress >= 4) {
    codes.push('HIGH_STRESS')
    out = EASE_RPE(out, 1)
  }

  if (
    codes.length === 0 &&
    checkIn.energy >= 5 &&
    checkIn.sleepHours >= 7.5 &&
    checkIn.soreness <= 2
  ) {
    codes.push('GREEN_LIGHT')
    const [first, ...rest] = out.exercises
    if (first) out = { ...out, exercises: [{ ...first, sets: first.sets + 1 }, ...rest] }
  }

  if (checkIn.minutesAvailable > 0 && estimate(out) > checkIn.minutesAvailable) {
    codes.push('SHORT_ON_TIME')
    out = fitToTime(out, checkIn.minutesAvailable)
  }

  if (codes.length === 0) codes.push('NO_CHANGE')

  // One reason, the strongest. Four bullet points is a report, not a coach.
  const lead = codes[0]!
  const arg =
    lead === 'SLEEP_DEBT'
      ? checkIn.sleepHours
      : lead === 'SHORT_ON_TIME'
        ? checkIn.minutesAvailable
        : 0

  out = { ...out, estMinutes: estimate(out) }

  return {
    day: out,
    codes,
    line: LINES[lead](arg),
    setsDelta: countSets(out) - before,
    minutesDelta: out.estMinutes - beforeMinutes,
  }
}

export function adaptationLine(a: Adaptation, locale: Locale): string {
  return a.line[locale]
}
