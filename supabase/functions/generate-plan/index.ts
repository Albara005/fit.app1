import { authenticate, hasConsent, json, logEvent, withinQuota, corsHeaders } from '../_shared/http.ts'
import { anthropic, MODEL, toModelSafe, type ModelSafeProfile } from '../_shared/model.ts'
import { buildTemplatePlan } from '../_shared/lib/plan/engine.ts'
import { deriveProfile } from '../_shared/lib/plan/nutrition.ts'
import { gate } from '../_shared/lib/safety/gate.ts'
import type { DerivedProfile, Plan, Profile } from '../_shared/lib/types.ts'

const DAILY_PLAN_LIMIT = 6
const MAX_MODEL_ATTEMPTS = 2

/**
 * The response the model is constrained to. Nothing else is accepted — a plan
 * that does not match the schema is a failed attempt, not something to repair
 * by hand.
 */
const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['nutrition', 'days', 'meals', 'rationale'],
  properties: {
    nutrition: {
      type: 'object',
      additionalProperties: false,
      required: ['kcal', 'protein', 'carbs', 'fat', 'deficit', 'weeklyLossTargetKg'],
      properties: {
        kcal: { type: 'integer' },
        protein: { type: 'integer' },
        carbs: { type: 'integer' },
        fat: { type: 'integer' },
        deficit: { type: 'integer' },
        weeklyLossTargetKg: { type: 'number' },
      },
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'focus', 'exercises'],
        properties: {
          title: { type: 'string' },
          focus: { type: 'array', items: { type: 'string' } },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'name', 'sets', 'reps', 'restSec', 'rpe'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'string' },
                restSec: { type: 'integer' },
                rpe: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    meals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slot', 'title', 'items'],
        properties: {
          slot: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          title: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat', 'ingredients'],
              properties: {
                name: { type: 'string' },
                grams: { type: 'integer' },
                kcal: { type: 'integer' },
                protein: { type: 'integer' },
                carbs: { type: 'integer' },
                fat: { type: 'integer' },
                // Every component, spelled out. "sauce" is not an ingredient
                // list, and the gate can only reject what it can read.
                ingredients: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    rationale: { type: 'string' },
  },
} as const

function systemPrompt(profile: ModelSafeProfile, template: Plan): string {
  const lang = profile.locale === 'ar' ? 'Gulf Arabic' : 'English'
  return [
    `You write one week of training and meals for a fitness app used in Oman and Saudi Arabia.`,
    `Write all user-facing text directly in ${lang}. Do not write it in another language first.`,
    profile.locale === 'ar'
      ? 'Tone: a warm Gulf coach speaking plainly. Not formal Modern Standard Arabic, not clinical.'
      : 'Tone: a warm, plain-spoken coach.',
    '',
    'Hard requirements:',
    `- Total daily calories must be ${template.nutrition.kcal} ± 60.`,
    `- Protein must be at least ${template.nutrition.protein} g.`,
    `- Exercise ids must come from this list: ${template.days.flatMap((d) => d.exercises.map((e) => e.id)).join(', ')}.`,
    `- Produce exactly ${template.days.length} training days.`,
    '- List every ingredient explicitly, including oils, sauces and garnishes.',
    profile.allergies.length > 0
      ? `- The person is allergic to: ${profile.allergies.join(', ')}. Nothing containing these, or derived from them, may appear anywhere.`
      : '',
    '- Meals should be food people actually eat in the Gulf, not generic diet food.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Maps the model's flat JSON onto the plan shape the gate and the app expect. */
function materialise(raw: Record<string, any>, template: Plan, locale: 'ar' | 'en'): Plan {
  const other = locale === 'ar' ? 'en' : 'ar'
  const bilingual = (text: string, fallback: { ar: string; en: string }) =>
    ({ [locale]: text, [other]: fallback[other] }) as { ar: string; en: string }

  return {
    ...template,
    source: 'model',
    nutrition: raw.nutrition,
    rationale: bilingual(raw.rationale, template.rationale),
    days: (raw.days ?? []).map((day: any, i: number) => {
      const base = template.days[i] ?? template.days[0]!
      return {
        ...base,
        title: bilingual(day.title, base.title),
        exercises: (day.exercises ?? []).map((ex: any) => {
          // Movement pattern and muscles come from our library, never from the
          // model: the injury blocklist is only as good as the pattern label.
          const known = base.exercises.find((e) => e.id === ex.id)
          return {
            ...(known ?? base.exercises[0]!),
            id: ex.id,
            sets: ex.sets,
            reps: ex.reps,
            restSec: ex.restSec,
            rpe: ex.rpe,
          }
        }),
      }
    }),
    meals: (raw.meals ?? []).map((meal: any, i: number) => ({
      id: `meal-${i}-${meal.slot}`,
      slot: meal.slot,
      title: bilingual(meal.title, { ar: meal.title, en: meal.title }),
      items: (meal.items ?? []).map((item: any) => ({
        ...item,
        name: bilingual(item.name, { ar: item.name, en: item.name }),
      })),
    })),
  }
}

async function generate(
  safe: ModelSafeProfile,
  derived: DerivedProfile,
  template: Plan,
): Promise<{ plan: Plan; rejections: unknown[] }> {
  const client = anthropic()
  const rejections: unknown[] = []

  for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: PLAN_SCHEMA },
        },
        system: systemPrompt(safe, template),
        messages: [{ role: 'user', content: JSON.stringify(safe) }],
      })

      if (response.stop_reason === 'refusal') {
        rejections.push({ code: 'MODEL_REFUSAL', attempt })
        continue
      }

      const text = response.content.find((b) => b.type === 'text')
      if (!text || text.type !== 'text') {
        rejections.push({ code: 'NO_CONTENT', attempt })
        continue
      }

      const candidate = materialise(JSON.parse(text.text), template, safe.locale)
      const result = gate(candidate, derived)

      if (result.verdict === 'PASS' || result.verdict === 'OFFER_ALTERNATIVE') {
        return { plan: result.plan, rejections }
      }
      for (const reason of result.reasons) rejections.push({ ...reason, attempt, verdict: result.verdict })
    } catch (_error) {
      rejections.push({ code: 'MODEL_ERROR', attempt })
    }
  }

  // Two failures is enough. The rules-based plan is the answer, and the user
  // never sees an error screen for this.
  return { plan: template, rejections }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const caller = await authenticate(req)
  if (!caller) return json({ error: 'unauthorized' }, 401)

  const { weekIndex = 0 } = await req.json().catch(() => ({}))

  const { data: row } = await caller.db.from('profiles').select('*').single()
  if (!row) return json({ error: 'no_profile' }, 400)

  const profile: Profile = {
    age: row.age,
    sex: row.sex,
    heightCm: row.height_cm,
    weightKg: Number(row.weight_kg),
    goal: row.goal,
    activity: row.activity,
    daysPerWeek: row.days_per_week,
    equipment: row.equipment,
    injuries: row.injuries,
    allergies: row.allergies,
    dietary: row.dietary,
    locale: row.locale,
  }
  const derived = deriveProfile(profile)
  const template = buildTemplatePlan(derived, weekIndex)

  const { data: job } = await caller.admin
    .from('plan_jobs')
    .insert({ user_id: caller.userId, week_index: weekIndex, status: 'running' })
    .select()
    .single()

  // Without the transfer grant, or over quota, the rules-based plan ships. It
  // is a complete plan, so this is a quieter path — not a degraded one.
  const mayCallModel =
    (await hasConsent(caller, 'cross_border_transfer')) &&
    (await withinQuota(caller, 'generate-plan', DAILY_PLAN_LIMIT))

  const { plan, rejections } = mayCallModel
    ? await generate(toModelSafe(profile as unknown as Record<string, unknown>), derived, template)
    : { plan: template, rejections: [] }

  for (const rejection of rejections as Record<string, string>[]) {
    await caller.admin.from('safety_rejections').insert({
      user_id: caller.userId,
      verdict: rejection.verdict ?? 'REJECT',
      code: rejection.code,
      allergen: rejection.allergen ?? null,
      match_kind: rejection.matchKind ?? null,
      term: rejection.term ?? null,
      attempt: Number(rejection.attempt ?? 1),
      plan_source: 'model',
    })
  }

  const { data: saved } = await caller.admin
    .from('plans')
    .upsert(
      { user_id: caller.userId, week_index: weekIndex, source: plan.source, payload: plan },
      { onConflict: 'user_id,week_index' },
    )
    .select()
    .single()

  if (job) {
    await caller.admin
      .from('plan_jobs')
      .update({ status: 'ready', plan_id: saved?.id ?? null, attempts: MAX_MODEL_ATTEMPTS })
      .eq('id', job.id)
  }

  logEvent(caller.userId, 'plan_generated', {
    source: plan.source,
    rejections: rejections.length,
    week_index: weekIndex,
  })

  return json({ jobId: job?.id ?? null, plan })
})
