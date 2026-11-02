import type { Equipment, ExerciseSpec, MovementPattern, Muscle } from '../types'

const e = (
  id: string,
  ar: string,
  en: string,
  pattern: MovementPattern,
  muscles: Muscle[],
  equipment: Equipment,
  unilateral = false,
): ExerciseSpec => ({ id, name: { ar, en }, pattern, muscles, equipment, unilateral })

export const EXERCISES: readonly ExerciseSpec[] = [
  // ── squat ───────────────────────────────────────────────────────────────
  e('back_squat', 'سكوات بالبار', 'Back squat', 'squat_loaded_spine', ['quads', 'glutes'], 'barbell'),
  e('front_squat', 'سكوات أمامي', 'Front squat', 'squat_loaded_spine', ['quads', 'core'], 'barbell'),
  e('goblet_squat', 'سكوات جوبلت', 'Goblet squat', 'squat_supported', ['quads', 'glutes'], 'dumbbell'),
  e('leg_press', 'ضغط الأرجل', 'Leg press', 'squat_supported', ['quads', 'glutes'], 'machine'),
  e('hack_squat', 'هاك سكوات', 'Hack squat', 'squat_supported', ['quads'], 'machine'),
  e('box_squat', 'سكوات على صندوق', 'Box squat', 'squat_supported', ['quads', 'glutes'], 'none'),
  e('wall_sit', 'جلسة الحائط', 'Wall sit', 'squat_supported', ['quads'], 'none'),

  // ── hinge ───────────────────────────────────────────────────────────────
  e('deadlift', 'رفعة ميتة', 'Deadlift', 'hinge_loaded', ['hamstrings', 'glutes', 'back'], 'barbell'),
  e('rdl', 'رفعة رومانية', 'Romanian deadlift', 'hinge_loaded', ['hamstrings', 'glutes'], 'barbell'),
  e('db_rdl', 'رفعة رومانية بالدمبل', 'Dumbbell RDL', 'hinge_loaded', ['hamstrings', 'glutes'], 'dumbbell'),
  e('hip_thrust', 'دفع الحوض', 'Hip thrust', 'hinge_supported', ['glutes', 'hamstrings'], 'barbell'),
  e('glute_bridge', 'جسر الجلوتس', 'Glute bridge', 'hinge_supported', ['glutes'], 'none'),
  e('back_extension', 'تمديد الظهر', 'Back extension', 'hinge_supported', ['glutes', 'hamstrings'], 'machine'),
  e('leg_curl', 'ثني الأرجل', 'Leg curl', 'leg_isolation', ['hamstrings'], 'machine'),

  // ── lunge ───────────────────────────────────────────────────────────────
  e('walking_lunge', 'لانج مشي', 'Walking lunge', 'lunge', ['quads', 'glutes'], 'dumbbell', true),
  e('split_squat', 'سكوات مقسّم', 'Split squat', 'lunge', ['quads', 'glutes'], 'dumbbell', true),
  e('step_up', 'صعود الدرجة', 'Step-up', 'lunge', ['quads', 'glutes'], 'dumbbell', true),

  // ── horizontal push ─────────────────────────────────────────────────────
  e('bench_press', 'بنش برس', 'Bench press', 'push_horizontal_free', ['chest', 'triceps'], 'barbell'),
  e('db_bench', 'بنش بالدمبل', 'Dumbbell bench press', 'push_horizontal_free', ['chest', 'triceps'], 'dumbbell'),
  e('pushup', 'ضغط', 'Push-up', 'push_horizontal_free', ['chest', 'triceps', 'core'], 'none'),
  e('incline_db_press', 'بنش مائل بالدمبل', 'Incline dumbbell press', 'push_horizontal_free', ['chest', 'shoulders'], 'dumbbell'),
  e('machine_chest_press', 'ضغط صدر جهاز', 'Machine chest press', 'push_horizontal_machine', ['chest', 'triceps'], 'machine'),
  e('cable_fly', 'تفتيح كيبل', 'Cable fly', 'push_horizontal_machine', ['chest'], 'cable'),
  e('band_chest_press', 'ضغط صدر بالمطاط', 'Band chest press', 'push_horizontal_machine', ['chest', 'triceps'], 'bands'),

  // ── vertical push ───────────────────────────────────────────────────────
  e('ohp', 'ضغط كتف واقف', 'Overhead press', 'push_vertical', ['shoulders', 'triceps'], 'barbell'),
  e('db_shoulder_press', 'ضغط كتف بالدمبل', 'Dumbbell shoulder press', 'push_vertical', ['shoulders', 'triceps'], 'dumbbell'),
  e('lateral_raise', 'رفرفة جانبية', 'Lateral raise', 'arm_isolation', ['shoulders'], 'dumbbell'),
  e('cable_lateral', 'رفرفة كيبل', 'Cable lateral raise', 'arm_isolation', ['shoulders'], 'cable'),

  // ── pulls ───────────────────────────────────────────────────────────────
  e('barbell_row', 'تجديف بالبار', 'Barbell row', 'pull_horizontal', ['back', 'lats', 'biceps'], 'barbell'),
  e('db_row', 'تجديف بالدمبل', 'Dumbbell row', 'pull_horizontal', ['back', 'lats', 'biceps'], 'dumbbell', true),
  e('seated_row', 'تجديف جالس', 'Seated cable row', 'pull_horizontal', ['back', 'lats', 'biceps'], 'cable'),
  e('inverted_row', 'تجديف معلّق', 'Inverted row', 'pull_horizontal', ['back', 'lats', 'biceps'], 'none'),
  e('band_row', 'تجديف بالمطاط', 'Band row', 'pull_horizontal', ['back', 'lats'], 'bands'),
  e('pullup', 'عقلة', 'Pull-up', 'pull_vertical', ['lats', 'biceps'], 'none'),
  e('lat_pulldown', 'سحب أمامي', 'Lat pulldown', 'pull_vertical', ['lats', 'biceps'], 'cable'),
  e('band_pulldown', 'سحب بالمطاط', 'Band pulldown', 'pull_vertical', ['lats', 'biceps'], 'bands'),
  e('face_pull', 'سحب للوجه', 'Face pull', 'pull_horizontal', ['shoulders', 'back'], 'cable'),

  // ── arms ────────────────────────────────────────────────────────────────
  e('db_curl', 'مرجحة بايسبس', 'Dumbbell curl', 'arm_isolation', ['biceps'], 'dumbbell'),
  e('triceps_pushdown', 'ترايسبس كيبل', 'Triceps pushdown', 'arm_isolation', ['triceps'], 'cable'),
  e('band_curl', 'بايسبس بالمطاط', 'Band curl', 'arm_isolation', ['biceps'], 'bands'),

  // ── core ────────────────────────────────────────────────────────────────
  e('crunch', 'كرنش', 'Crunch', 'core_flexion', ['core'], 'none'),
  e('hanging_leg_raise', 'رفع الأرجل معلّق', 'Hanging leg raise', 'core_flexion', ['core'], 'none'),
  e('russian_twist', 'لف روسي', 'Russian twist', 'core_rotation', ['core'], 'dumbbell'),
  e('plank', 'بلانك', 'Plank', 'core_antiextension', ['core'], 'none'),
  e('dead_bug', 'دد بق', 'Dead bug', 'core_antiextension', ['core'], 'none'),
  e('pallof_press', 'بالوف برس', 'Pallof press', 'core_antiextension', ['core'], 'cable'),
  e('farmer_carry', 'حمل المزارع', 'Farmer carry', 'carry', ['core', 'back'], 'dumbbell'),

  // ── calves & conditioning ───────────────────────────────────────────────
  e('standing_calf', 'سمانة واقف', 'Standing calf raise', 'calf', ['calves'], 'machine'),
  e('bodyweight_calf', 'سمانة بوزن الجسم', 'Bodyweight calf raise', 'calf', ['calves'], 'none'),
  e('jump_rope', 'نط الحبل', 'Jump rope', 'jump', ['conditioning', 'calves'], 'none'),
  e('box_jump', 'قفز الصندوق', 'Box jump', 'jump', ['conditioning', 'quads'], 'none'),
  e('run_intervals', 'جري متقطع', 'Run intervals', 'impact', ['conditioning'], 'cardio'),
  e('cycling', 'دراجة ثابتة', 'Stationary bike', 'leg_isolation', ['conditioning', 'quads'], 'cardio'),
  e('rowing_erg', 'مجداف', 'Rowing machine', 'pull_horizontal', ['conditioning', 'back'], 'cardio'),
  e('incline_walk', 'مشي مائل', 'Incline walk', 'leg_isolation', ['conditioning'], 'cardio'),
]

const BY_ID = new Map(EXERCISES.map((x) => [x.id, x]))

export function exerciseById(id: string): ExerciseSpec | undefined {
  return BY_ID.get(id)
}

/** 'none' is always available — bodyweight needs no gym. */
export function availableTo(equipment: readonly Equipment[]): ExerciseSpec[] {
  const owned = new Set<Equipment>([...equipment, 'none'])
  return EXERCISES.filter((x) => owned.has(x.equipment))
}
