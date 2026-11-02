import { authenticate, hasConsent, json, logEvent, withinQuota, corsHeaders } from '../_shared/http.ts'
import { anthropic, MODEL } from '../_shared/model.ts'

const DAILY_MEAL_LIMIT = 20
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

/**
 * Analyses one meal photo and returns numbers. The image is held in this
 * request's memory and dropped when the response is written: there is no
 * storage bucket, no upload, no path, nothing to leak later. That is the whole
 * reason this runs on the server instead of writing to Storage first.
 */
const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'labelEn', 'kcal', 'protein', 'carbs', 'fat', 'ingredients', 'looksFried'],
  properties: {
    label: { type: 'string' },
    labelEn: { type: 'string' },
    kcal: { type: 'integer' },
    protein: { type: 'integer' },
    carbs: { type: 'integer' },
    fat: { type: 'integer' },
    ingredients: { type: 'array', items: { type: 'string' } },
    // Asked for explicitly because the fat estimate hinges on it and the user
    // gets asked the same question in one tap.
    looksFried: { type: 'boolean' },
  },
} as const

const SYSTEM = [
  'You estimate the contents of one plate of food, photographed in the Gulf.',
  'Return a single best point estimate for a normal portion. The app widens it into a range;',
  'do not hedge inside the numbers themselves.',
  'Gulf cooking uses considerably more oil and ghee than the dish names suggest — rice dishes,',
  'stews and grills are usually cooked in it. Account for that in the fat figure.',
  'List ingredients explicitly, including cooking fat, sauces, garnishes and nuts.',
  'Name the dish in Arabic as people in the Gulf say it.',
].join(' ')

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
const isImageType = (value: unknown): value is (typeof IMAGE_TYPES)[number] =>
  (IMAGE_TYPES as readonly unknown[]).includes(value)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const caller = await authenticate(req)
  if (!caller) return json({ error: 'unauthorized' }, 401)

  if (!(await hasConsent(caller, 'cross_border_transfer'))) {
    return json({ error: 'consent_required' }, 403)
  }
  if (!(await withinQuota(caller, 'analyze-meal', DAILY_MEAL_LIMIT))) {
    return json({ error: 'quota_exceeded' }, 429)
  }

  const body = await req.json().catch(() => null)
  const imageBase64: string | undefined = body?.imageBase64
  // Checked, not trusted: anything else is refused here, before it costs a
  // model call that the API would reject anyway.
  const mediaType = body?.mediaType ?? 'image/jpeg'
  if (!isImageType(mediaType)) return json({ error: 'unsupported_image_type' }, 400)
  if (!imageBase64) return json({ error: 'no_image' }, 400)
  if (imageBase64.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: 'image_too_large' }, 413)

  try {
    const response = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: MEAL_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: 'What is on this plate?' },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') return json({ error: 'analysis_unavailable' }, 422)

    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') return json({ error: 'analysis_unavailable' }, 422)

    logEvent(caller.userId, 'meal_analyzed')
    return json({ base: JSON.parse(text.text), source: 'photo' })
  } catch (_error) {
    // The optimistic entry the client already wrote stays; it just keeps its
    // provisional estimate. There is no error screen for this either.
    logEvent(caller.userId, 'meal_analysis_failed')
    return json({ error: 'analysis_unavailable' }, 422)
  }
})
