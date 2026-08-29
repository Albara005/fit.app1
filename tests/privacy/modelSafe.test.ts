import { describe, expect, it } from 'vitest'
import { MODEL_SAFE_KEYS, toModelSafe } from '../../lib/privacy/modelSafe'

describe('what the model is allowed to see', () => {
  it('drops every identifying field, however the row arrived', () => {
    const row = {
      user_id: '9d2c-uuid', id: 'row-1', email: 'a@b.com', name: 'البراء',
      phone: '+96890000000', device_id: 'ios-123', push_token: 'tok', city: 'مسقط',
      created_at: '2026-08-29', updated_at: '2026-08-29',
      age: 30, sex: 'm', heightCm: 175, weightKg: 85, goal: 'cut', activity: 'moderate',
      daysPerWeek: 4, equipment: ['barbell'], injuries: ['knee'], allergies: ['sesame'],
      dietary: ['halal'], locale: 'ar',
    }

    const safe = toModelSafe(row) as Record<string, unknown>
    expect(Object.keys(safe).sort()).toEqual([...MODEL_SAFE_KEYS].sort())

    const serialised = JSON.stringify(safe)
    for (const secret of ['9d2c-uuid', 'a@b.com', 'البراء', '+96890000000', 'ios-123', 'tok', 'مسقط']) {
      expect(serialised, secret).not.toContain(secret)
    }
  })

  it('carries exactly the fields the plan actually needs', () => {
    // Locked deliberately: widening this set is a privacy decision, and a
    // failing test here is the point at which someone has to justify it.
    expect([...MODEL_SAFE_KEYS].sort()).toEqual([
      'activity', 'age', 'allergies', 'daysPerWeek', 'dietary', 'equipment',
      'goal', 'heightCm', 'injuries', 'locale', 'sex', 'weightKg',
    ])
  })

  it('does not invent values for fields the row is missing', () => {
    const safe = toModelSafe({ age: 30 }) as Record<string, unknown>
    expect(safe.weightKg).toBeUndefined()
    expect(safe.age).toBe(30)
  })
})
