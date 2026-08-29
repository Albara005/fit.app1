import { create } from 'zustand'
import type { AllergenId } from '../safety/allergens'
import type { ActivityLevel, DietaryId, Equipment, Goal, InjuryId, Profile, Sex } from '../types'

interface Draft extends Omit<Profile, 'locale'> {}

interface OnboardingState extends Draft {
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void
  toggle: <K extends 'equipment' | 'injuries' | 'allergies' | 'dietary'>(
    key: K,
    value: Draft[K][number],
  ) => void
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

export const useOnboarding = create<OnboardingState>((set) => ({
  ...INITIAL,
  set: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
  toggle: (key, value) =>
    set((state) => {
      const list = state[key] as string[]
      return {
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      } as Partial<OnboardingState>
    }),
  reset: () => set(INITIAL),
}))

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
