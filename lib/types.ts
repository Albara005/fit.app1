import type { AllergenId } from './safety/allergens'

export type Sex = 'm' | 'f'
export type Goal = 'cut' | 'recomp' | 'gain' | 'strength'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Equipment = 'none' | 'bands' | 'dumbbell' | 'barbell' | 'machine' | 'cable' | 'cardio'
export type Locale = 'ar' | 'en'

export type InjuryId =
  | 'lower_back'
  | 'knee'
  | 'shoulder'
  | 'neck'
  | 'wrist'
  | 'elbow'
  | 'ankle'
  | 'hip'
  | 'hernia'

export type DietaryId = 'halal' | 'vegetarian' | 'vegan' | 'no_red_meat' | 'low_carb' | 'diabetic'

export type MovementPattern =
  | 'squat_loaded_spine'
  | 'squat_supported'
  | 'hinge_loaded'
  | 'hinge_supported'
  | 'lunge'
  | 'push_horizontal_free'
  | 'push_horizontal_machine'
  | 'push_vertical'
  | 'pull_horizontal'
  | 'pull_vertical'
  | 'carry'
  | 'core_flexion'
  | 'core_antiextension'
  | 'core_rotation'
  | 'jump'
  | 'impact'
  | 'arm_isolation'
  | 'leg_isolation'
  | 'calf'

export type Muscle =
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'chest'
  | 'back'
  | 'lats'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'conditioning'

/** Everything the safety gate is allowed to see. No identity fields, by design. */
export interface Profile {
  age: number
  sex: Sex
  heightCm: number
  weightKg: number
  goal: Goal
  activity: ActivityLevel
  daysPerWeek: number
  equipment: Equipment[]
  injuries: InjuryId[]
  allergies: AllergenId[]
  dietary: DietaryId[]
  locale: Locale
}

/** Profile plus the values the gate's thresholds are expressed in. */
export interface DerivedProfile extends Profile {
  bmi: number
  bmr: number
  tdee: number
}

export interface ExerciseSpec {
  id: string
  name: { ar: string; en: string }
  pattern: MovementPattern
  muscles: Muscle[]
  equipment: Equipment
  unilateral: boolean
}

export interface PlannedExercise {
  id: string
  name: { ar: string; en: string }
  pattern: MovementPattern
  muscles: Muscle[]
  equipment: Equipment
  sets: number
  reps: string
  restSec: number
  rpe: number
  /** Set when the safety gate swapped this in for a blocked pattern. */
  substitutedFor?: { id: string; injury: InjuryId; pattern: MovementPattern }
}

export interface WorkoutDay {
  id: string
  dayIndex: number
  title: { ar: string; en: string }
  focus: Muscle[]
  rest: boolean
  estMinutes: number
  exercises: PlannedExercise[]
}

export interface MealItem {
  name: { ar: string; en: string }
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  ingredients: string[]
}

export interface Meal {
  id: string
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  title: { ar: string; en: string }
  items: MealItem[]
}

export interface NutritionTarget {
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** Absolute kcal below maintenance. Positive means a deficit. */
  deficit: number
  weeklyLossTargetKg: number
}

export interface Plan {
  id: string
  createdAt: string
  weekIndex: number
  source: 'model' | 'template'
  locale: Locale
  nutrition: NutritionTarget
  days: WorkoutDay[]
  meals: Meal[]
  /** Coach line explaining what this week is for. */
  rationale: { ar: string; en: string }
}

export interface CheckIn {
  date: string
  sleepHours: number
  energy: 1 | 2 | 3 | 4 | 5
  soreness: 1 | 2 | 3 | 4 | 5
  stress: 1 | 2 | 3 | 4 | 5
  minutesAvailable: number
  weightKg?: number
}

export type CookMethod = 'fried' | 'grilled' | 'boiled'
export type PortionSize = 'half' | 'normal' | 'large'

export interface MacroRange {
  min: number
  max: number
}

export interface MealEstimate {
  kcal: MacroRange
  protein: MacroRange
  carbs: MacroRange
  fat: MacroRange
  confidence: 'low' | 'medium' | 'high'
}

export interface MealLogEntry {
  id: string
  loggedAt: string
  dishId: string | null
  label: string
  cookMethod: CookMethod | null
  portion: PortionSize | null
  estimate: MealEstimate
  status: 'estimating' | 'ready' | 'corrected'
  /** User-entered truth. Feeds dish memory; never overwritten by the model. */
  correctedKcal?: number
}

/**
 * The line a review decided from, in reading order: `at` is a position along
 * the readings (fractional where a line starts mid-window), `kg` its height.
 * Charts draw this rather than fitting their own, so they cannot show a trend
 * the coach did not act on.
 */
export interface TrendLine {
  from: { at: number; kg: number }
  to: { at: number; kg: number }
}
