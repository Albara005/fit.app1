import { create } from 'zustand'
import type { AllergenId } from '../safety/allergens'
import type { ActivityLevel, DietaryId, Equipment, Goal, InjuryId, Profile, Sex } from '../types'

interface Draft extends Omit<Profile, 'locale'> {}

/** The two questions the safety gate depends on. */
type Declared = 'injuries' | 'allergies'

interface OnboardingState extends Draft {
  /**
   * Whether the person has actually answered. An empty list is not an answer:
   * it is also what a question nobody looked at contains, and the gate cannot
   * tell "no allergies" from "never asked".
   */
  answered: Record<Declared, boolean>
  /**
   * Whether this draft was started on purpose — fresh by reset(), or from a
   * saved profile by hydrate(). False after a reload, when the draft is only
   * the defaults and belongs to nobody.
   */
  started: boolean
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void
  toggle: <K extends 'equipment' | 'injuries' | 'allergies' | 'dietary'>(
    key: K,
    value: Draft[K][number],
  ) => void
  /** Records an explicit "none". */
  declareNone: (key: Declared) => void
  /**
   * Loads a saved profile so that editing starts from what is true, not from
   * the defaults. Without it, editing one field after a restart rewrote every
   * other one — allergies included — with a stranger's.
   */
  hydrate: (profile: Profile) => void
  reset: () => void
}

/**
 * Defaults are a plausible person, not empty fields. Someone answering
 * "how tall are you" from a blank stepper is being made to do arithmetic; from
 * 170 they are being asked to nudge.
 */
const INITIAL: Draft = {
  age: 28,
  sex: 'm',
  heightCm: 172,
  weightKg: 78,
  goal: 'recomp',
  activity: 'light',
  daysPerWeek: 3,
  equipment: ['none'],
  injuries: [],
  allergies: [],
  dietary: ['halal'],
}

const UNANSWERED: Record<Declared, boolean> = { injuries: false, allergies: false }

export const useOnboarding = create<OnboardingState>((set) => ({
  ...INITIAL,
  answered: UNANSWERED,
  started: false,
  set: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
  toggle: (key, value) =>
    set((state) => {
      const list = state[key] as string[]
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
      // Picking an item is an answer; un-picking the last one is not "none".
      const answered =
        key === 'injuries' || key === 'allergies'
          ? { ...state.answered, [key]: next.length > 0 }
          : state.answered
      return { [key]: next, answered } as Partial<OnboardingState>
    }),
  declareNone: (key) =>
    set((state) => ({ [key]: [], answered: { ...state.answered, [key]: true } }) as Partial<OnboardingState>),
  hydrate: (profile) => {
    const { locale: _locale, ...draft } = profile
    // A saved profile was answered when it was saved.
    set({ ...draft, answered: { injuries: true, allergies: true }, started: true })
  },
  reset: () => set({ ...INITIAL, answered: UNANSWERED, started: true }),
}))

/** An explicit "none" — answered, and empty. */
export const noneDeclared = (state: OnboardingState, key: Declared) =>
  state.answered[key] && state[key].length === 0

/** Both safety questions answered: the only draft that may be saved. */
export const allAnswered = (state: OnboardingState) => state.answered.injuries && state.answered.allergies

export const SEXES: Sex[] = ['m', 'f']
export const GOALS: Goal[] = ['cut', 'recomp', 'gain', 'strength']
export const ACTIVITIES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']
export const EQUIPMENT: Equipment[] = ['none', 'bands', 'dumbbell', 'barbell', 'machine', 'cable', 'cardio']
export const INJURIES: InjuryId[] = [
  'lower_back', 'knee', 'shoulder', 'neck', 'wrist', 'elbow', 'ankle', 'hip', 'hernia',
]
export const ALLERGENS: AllergenId[] = [
  'sesame', 'dairy', 'gluten', 'treenut', 'peanut', 'egg', 'shellfish', 'fish', 'soy',
]
export const DIETS: DietaryId[] = ['vegetarian', 'vegan', 'no_red_meat', 'low_carb', 'diabetic']
