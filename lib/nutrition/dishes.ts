import type { AllergenId } from '../safety/allergens'
import type { DietaryId } from '../types'

export type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type DishRole = 'protein' | 'carb' | 'veg' | 'fat' | 'whole'

export interface Dish {
  id: string
  name: { ar: string; en: string }
  role: DishRole
  slots: Slot[]
  per100g: { kcal: number; protein: number; carbs: number; fat: number }
  servingG: number
  minG: number
  maxG: number
  ingredients: string[]
  /** Diets this dish is compatible with. 'halal' is assumed throughout. */
  fits: DietaryId[]
  /**
   * Declared allergens, used to filter the pool before generation. The gate
   * still re-checks every ingredient string — this is a shortcut, not a
   * substitute for it.
   */
  contains: AllergenId[]
  /** Cooked in visible oil: widens the fat range on photo estimates. */
  oily: boolean
}

const d = (x: Dish): Dish => x

export const DISHES: readonly Dish[] = [
  // ── proteins ────────────────────────────────────────────────────────────
  d({
    id: 'grilled_chicken', name: { ar: 'صدر دجاج مشوي', en: 'Grilled chicken breast' },
    role: 'protein', slots: ['lunch', 'dinner'],
    per100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, servingG: 150, minG: 100, maxG: 250,
    ingredients: ['دجاج', 'ملح', 'فلفل أسود', 'ليمون'], fits: ['halal', 'low_carb', 'no_red_meat', 'diabetic'],
    contains: [], oily: false,
  }),
  d({
    id: 'grilled_hammour', name: { ar: 'هامور مشوي', en: 'Grilled hammour' },
    role: 'protein', slots: ['lunch', 'dinner'],
    per100g: { kcal: 105, protein: 22, carbs: 0, fat: 2 }, servingG: 160, minG: 100, maxG: 250,
    ingredients: ['سمك هامور', 'ليمون', 'كزبرة'], fits: ['halal', 'low_carb', 'no_red_meat', 'diabetic'],
    contains: ['fish'], oily: false,
  }),
  d({
    id: 'beef_mince', name: { ar: 'لحم مفروم مطبوخ', en: 'Cooked beef mince' },
    role: 'protein', slots: ['lunch', 'dinner'],
    per100g: { kcal: 215, protein: 26, carbs: 1, fat: 12 }, servingG: 130, minG: 90, maxG: 200,
    ingredients: ['لحم بقر', 'بصل', 'بهارات'], fits: ['halal'], contains: [], oily: true,
  }),
  d({
    id: 'lamb_stew', name: { ar: 'مرق لحم غنم', en: 'Lamb stew' },
    role: 'whole', slots: ['lunch', 'dinner'],
    per100g: { kcal: 145, protein: 14, carbs: 6, fat: 7 }, servingG: 250, minG: 150, maxG: 400,
    ingredients: ['لحم غنم', 'طماطم', 'بصل', 'جزر', 'بهارات', 'زيت'], fits: ['halal'], contains: [], oily: true,
  }),
  d({
    id: 'eggs_boiled', name: { ar: 'بيض مسلوق', en: 'Boiled eggs' },
    role: 'protein', slots: ['breakfast', 'snack'],
    per100g: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 }, servingG: 100, minG: 50, maxG: 200,
    ingredients: ['بيض', 'ملح'], fits: ['halal', 'vegetarian', 'low_carb', 'no_red_meat', 'diabetic'],
    contains: ['egg'], oily: false,
  }),
  d({
    id: 'tuna_can', name: { ar: 'تونة معلبة بالماء', en: 'Canned tuna in water' },
    role: 'protein', slots: ['lunch', 'snack'],
    per100g: { kcal: 116, protein: 26, carbs: 0, fat: 1 }, servingG: 100, minG: 60, maxG: 180,
    ingredients: ['تونة', 'ماء', 'ملح'], fits: ['halal', 'low_carb', 'no_red_meat', 'diabetic'],
    contains: ['fish'], oily: false,
  }),
  d({
    id: 'labneh', name: { ar: 'لبنة', en: 'Labneh' },
    role: 'protein', slots: ['breakfast', 'snack'],
    per100g: { kcal: 174, protein: 8, carbs: 6, fat: 13 }, servingG: 80, minG: 40, maxG: 150,
    ingredients: ['لبنة', 'زيت زيتون'], fits: ['halal', 'vegetarian', 'no_red_meat'],
    contains: ['dairy'], oily: false,
  }),
  d({
    id: 'greek_yoghurt', name: { ar: 'زبادي يوناني', en: 'Greek yoghurt' },
    role: 'protein', slots: ['breakfast', 'snack'],
    per100g: { kcal: 97, protein: 9, carbs: 4, fat: 5 }, servingG: 170, minG: 100, maxG: 300,
    ingredients: ['زبادي'], fits: ['halal', 'vegetarian', 'no_red_meat', 'diabetic'],
    contains: ['dairy'], oily: false,
  }),
  d({
    id: 'chickpeas', name: { ar: 'حمص حب مسلوق', en: 'Boiled chickpeas' },
    role: 'protein', slots: ['lunch', 'dinner', 'snack'],
    per100g: { kcal: 164, protein: 9, carbs: 27, fat: 2.6 }, servingG: 150, minG: 80, maxG: 250,
    ingredients: ['حمص حب مسلوق', 'كمون', 'ليمون'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat'],
    contains: [], oily: false,
  }),
  d({
    id: 'lentils', name: { ar: 'عدس مطبوخ', en: 'Cooked lentils' },
    role: 'protein', slots: ['lunch', 'dinner'],
    per100g: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 }, servingG: 200, minG: 120, maxG: 320,
    ingredients: ['عدس', 'بصل', 'كمون'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'diabetic'],
    contains: [], oily: false,
  }),
  d({
    id: 'foul_mudammas', name: { ar: 'فول مدمس', en: 'Foul mudammas' },
    role: 'whole', slots: ['breakfast'],
    per100g: { kcal: 110, protein: 7, carbs: 15, fat: 2.5 }, servingG: 200, minG: 120, maxG: 320,
    ingredients: ['فول مدمس', 'زيت زيتون', 'ليمون', 'كمون'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat'],
    contains: [], oily: false,
  }),
  d({
    id: 'cottage_cheese', name: { ar: 'جبن قريش', en: 'Cottage cheese' },
    role: 'protein', slots: ['breakfast', 'snack'],
    per100g: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 }, servingG: 150, minG: 80, maxG: 250,
    ingredients: ['جبن قريش'], fits: ['halal', 'vegetarian', 'no_red_meat', 'diabetic'],
    contains: ['dairy'], oily: false,
  }),
  d({
    id: 'tofu', name: { ar: 'توفو مشوي', en: 'Grilled tofu' },
    role: 'protein', slots: ['lunch', 'dinner'],
    per100g: { kcal: 144, protein: 15, carbs: 3, fat: 8 }, servingG: 150, minG: 100, maxG: 250,
    ingredients: ['توفو', 'زيت', 'بهارات'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat'],
    contains: ['soy'], oily: true,
  }),

  // ── carbs ───────────────────────────────────────────────────────────────
  d({
    id: 'white_rice', name: { ar: 'أرز أبيض مطبوخ', en: 'Cooked white rice' },
    role: 'carb', slots: ['lunch', 'dinner'],
    per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, servingG: 180, minG: 80, maxG: 350,
    ingredients: ['أرز', 'ماء', 'ملح'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat'],
    contains: [], oily: false,
  }),
  d({
    id: 'brown_rice', name: { ar: 'أرز بني مطبوخ', en: 'Cooked brown rice' },
    role: 'carb', slots: ['lunch', 'dinner'],
    per100g: { kcal: 123, protein: 2.7, carbs: 26, fat: 1 }, servingG: 180, minG: 80, maxG: 350,
    ingredients: ['أرز بني', 'ماء'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'diabetic'],
    contains: [], oily: false,
  }),
  d({
    id: 'arabic_bread', name: { ar: 'خبز عربي', en: 'Arabic bread' },
    role: 'carb', slots: ['breakfast', 'lunch', 'dinner'],
    per100g: { kcal: 275, protein: 9, carbs: 55, fat: 1.2 }, servingG: 60, minG: 30, maxG: 150,
    ingredients: ['دقيق قمح', 'ماء', 'خميرة', 'ملح'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat'],
    contains: ['gluten'], oily: false,
  }),
  d({
    id: 'oats', name: { ar: 'شوفان', en: 'Oats' },
    role: 'carb', slots: ['breakfast', 'snack'],
    per100g: { kcal: 389, protein: 17, carbs: 66, fat: 7 }, servingG: 60, minG: 30, maxG: 120,
    ingredients: ['شوفان'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'diabetic'],
    contains: ['gluten'], oily: false,
  }),
  d({
    id: 'sweet_potato', name: { ar: 'بطاطا حلوة مشوية', en: 'Roasted sweet potato' },
    role: 'carb', slots: ['lunch', 'dinner'],
    per100g: { kcal: 90, protein: 2, carbs: 21, fat: 0.2 }, servingG: 200, minG: 100, maxG: 350,
    ingredients: ['بطاطا حلوة'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'diabetic'],
    contains: [], oily: false,
  }),
  d({
    id: 'potato_boiled', name: { ar: 'بطاطس مسلوقة', en: 'Boiled potato' },
    role: 'carb', slots: ['lunch', 'dinner'],
    per100g: { kcal: 87, protein: 2, carbs: 20, fat: 0.1 }, servingG: 200, minG: 100, maxG: 350,
    ingredients: ['بطاطس', 'ملح'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat'],
    contains: [], oily: false,
  }),
  d({
    id: 'dates', name: { ar: 'تمر', en: 'Dates' },
    role: 'carb', slots: ['breakfast', 'snack'],
    per100g: { kcal: 282, protein: 2.5, carbs: 75, fat: 0.4 }, servingG: 40, minG: 20, maxG: 80,
    ingredients: ['تمر'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat'],
    contains: [], oily: false,
  }),
  d({
    id: 'banana', name: { ar: 'موز', en: 'Banana' },
    role: 'carb', slots: ['breakfast', 'snack'],
    per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 }, servingG: 120, minG: 60, maxG: 240,
    ingredients: ['موز'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat'],
    contains: [], oily: false,
  }),

  // ── vegetables ──────────────────────────────────────────────────────────
  d({
    id: 'arab_salad', name: { ar: 'سلطة عربية', en: 'Arabic salad' },
    role: 'veg', slots: ['lunch', 'dinner'],
    per100g: { kcal: 35, protein: 1, carbs: 5, fat: 1.4 }, servingG: 200, minG: 100, maxG: 350,
    ingredients: ['خيار', 'طماطم', 'بقدونس', 'ليمون', 'زيت زيتون'],
    fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'low_carb', 'diabetic'], contains: [], oily: false,
  }),
  d({
    id: 'grilled_veg', name: { ar: 'خضار مشوية', en: 'Grilled vegetables' },
    role: 'veg', slots: ['lunch', 'dinner'],
    per100g: { kcal: 62, protein: 2, carbs: 8, fat: 2.6 }, servingG: 200, minG: 100, maxG: 350,
    ingredients: ['كوسا', 'باذنجان', 'فلفل', 'زيت زيتون'],
    fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'low_carb', 'diabetic'], contains: [], oily: true,
  }),
  d({
    id: 'cucumber_sticks', name: { ar: 'خيار مقطّع', en: 'Cucumber sticks' },
    role: 'veg', slots: ['snack'],
    per100g: { kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 }, servingG: 150, minG: 80, maxG: 300,
    ingredients: ['خيار'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'low_carb', 'diabetic'],
    contains: [], oily: false,
  }),

  // ── fats ────────────────────────────────────────────────────────────────
  d({
    id: 'olive_oil', name: { ar: 'زيت زيتون', en: 'Olive oil' },
    role: 'fat', slots: ['lunch', 'dinner', 'breakfast'],
    per100g: { kcal: 884, protein: 0, carbs: 0, fat: 100 }, servingG: 12, minG: 5, maxG: 25,
    ingredients: ['زيت زيتون'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'low_carb', 'diabetic'],
    contains: [], oily: true,
  }),
  d({
    id: 'avocado', name: { ar: 'أفوكادو', en: 'Avocado' },
    role: 'fat', slots: ['breakfast', 'lunch', 'snack'],
    per100g: { kcal: 160, protein: 2, carbs: 9, fat: 15 }, servingG: 80, minG: 40, maxG: 150,
    ingredients: ['أفوكادو'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'low_carb', 'diabetic'],
    contains: [], oily: false,
  }),
  d({
    id: 'almonds', name: { ar: 'لوز', en: 'Almonds' },
    role: 'fat', slots: ['snack'],
    per100g: { kcal: 579, protein: 21, carbs: 22, fat: 50 }, servingG: 25, minG: 10, maxG: 50,
    ingredients: ['لوز'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'low_carb', 'diabetic'],
    contains: ['treenut'], oily: false,
  }),
  d({
    id: 'tahini', name: { ar: 'طحينة', en: 'Tahini' },
    role: 'fat', slots: ['lunch', 'dinner'],
    per100g: { kcal: 595, protein: 17, carbs: 21, fat: 54 }, servingG: 20, minG: 10, maxG: 40,
    ingredients: ['طحينة', 'ليمون'], fits: ['halal', 'vegetarian', 'vegan', 'no_red_meat', 'low_carb'],
    contains: ['sesame'], oily: false,
  }),
]

const BY_ID = new Map(DISHES.map((x) => [x.id, x]))

export function dishById(id: string): Dish | undefined {
  return BY_ID.get(id)
}
