import { deriveProfile } from '../lib/plan/nutrition'
import type { DerivedProfile, Meal, MealItem, Plan, PlannedExercise, Profile, WorkoutDay } from '../lib/types'

export function makeProfile(over: Partial<Profile> = {}): DerivedProfile {
  return deriveProfile({
    age: 30,
    sex: 'm',
    heightCm: 175,
    weightKg: 85,
    goal: 'cut',
    activity: 'moderate',
    daysPerWeek: 4,
    equipment: ['dumbbell', 'barbell', 'machine', 'cable'],
    injuries: [],
    allergies: [],
    dietary: ['halal'],
    locale: 'ar',
    ...over,
  })
}

export function makeItem(over: Partial<MealItem> = {}): MealItem {
  return {
    name: { ar: 'صدر دجاج مشوي', en: 'Grilled chicken breast' },
    grams: 150,
    kcal: 250,
    protein: 46,
    carbs: 0,
    fat: 6,
    ingredients: ['دجاج', 'ملح', 'فلفل أسود'],
    ...over,
  }
}

export function makeMeal(over: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    slot: 'lunch',
    title: { ar: 'غداء', en: 'Lunch' },
    items: [makeItem()],
    ...over,
  }
}

export function makeExercise(over: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    id: 'back_squat',
    name: { ar: 'سكوات بالبار', en: 'Back squat' },
    pattern: 'squat_loaded_spine',
    muscles: ['quads', 'glutes'],
    equipment: 'barbell',
    sets: 3,
    reps: '6-8',
    restSec: 150,
    rpe: 7,
    ...over,
  }
}

export function makeDay(over: Partial<WorkoutDay> = {}): WorkoutDay {
  return {
    id: 'day-1',
    dayIndex: 0,
    title: { ar: 'يوم 1', en: 'Day 1' },
    focus: ['quads'],
    rest: false,
    estMinutes: 45,
    exercises: [makeExercise()],
    ...over,
  }
}

export function makePlan(over: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    createdAt: '2026-08-29T00:00:00.000Z',
    weekIndex: 0,
    source: 'template',
    locale: 'ar',
    nutrition: {
      kcal: 2100,
      protein: 170,
      carbs: 200,
      fat: 60,
      deficit: 400,
      weeklyLossTargetKg: 0.36,
    },
    days: [makeDay()],
    meals: [makeMeal()],
    rationale: { ar: 'أسبوع تأسيس', en: 'Base week' },
    ...over,
  }
}
