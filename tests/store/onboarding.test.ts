import { beforeEach, describe, expect, it } from 'vitest'
import { allAnswered, noneDeclared, useOnboarding } from '../../lib/store/onboarding'
import { makeProfile } from '../factories'

const state = () => useOnboarding.getState()

beforeEach(() => state().reset())

describe('the two safety questions need an answer, not a default', () => {
  it('start unanswered, so "no allergies" is never assumed', () => {
    expect(state().allergies).toEqual([])
    expect(state().answered).toEqual({ injuries: false, allergies: false })
  })

  it('count picking an allergen as an answer', () => {
    state().toggle('allergies', 'sesame')
    expect(state().answered.allergies).toBe(true)
  })

  it('do not count un-picking the last allergen as "none"', () => {
    state().toggle('allergies', 'sesame')
    state().toggle('allergies', 'sesame')
    expect(state().allergies).toEqual([])
    expect(state().answered.allergies).toBe(false)
  })

  it('record an explicit "none" as answered and empty', () => {
    state().toggle('injuries', 'knee')
    state().declareNone('injuries')
    expect(state().injuries).toEqual([])
    expect(state().answered.injuries).toBe(true)
  })

  it('leave the other question alone', () => {
    state().declareNone('allergies')
    expect(state().answered.injuries).toBe(false)
  })

  it('do not track answers for lists the gate does not read', () => {
    state().toggle('equipment', 'dumbbell')
    expect(state().answered).toEqual({ injuries: false, allergies: false })
  })
})

describe('editing a saved profile', () => {
  // The regression: the draft lives in memory, so after a restart it held the
  // defaults. Editing one field then saved allergies: [] over the real ones.
  it('starts from the saved allergies and injuries, not from the defaults', () => {
    state().hydrate(makeProfile({ allergies: ['sesame', 'peanut'], injuries: ['knee'], age: 41 }))
    expect(state().allergies).toEqual(['sesame', 'peanut'])
    expect(state().injuries).toEqual(['knee'])
    expect(state().age).toBe(41)
  })

  it('treats a saved profile as already answered', () => {
    state().hydrate(makeProfile({ allergies: [] }))
    expect(state().answered).toEqual({ injuries: true, allergies: true })
  })

  it('does not carry the locale into the draft', () => {
    state().hydrate(makeProfile({ locale: 'en' }))
    expect('locale' in state()).toBe(false)
  })
})

describe('a draft belongs to someone only once it is started', () => {
  it('is not started by itself, as after a reload', () => {
    useOnboarding.setState({ started: false })
    expect(state().started).toBe(false)
  })

  it('is started by a fresh reset', () => {
    useOnboarding.setState({ started: false })
    state().reset()
    expect(state().started).toBe(true)
  })

  it('is started by loading a saved profile', () => {
    useOnboarding.setState({ started: false })
    state().hydrate(makeProfile())
    expect(state().started).toBe(true)
  })
})

describe('selectors', () => {
  it('read an explicit "none" only when answered and empty', () => {
    expect(noneDeclared(state(), 'allergies')).toBe(false)
    state().declareNone('allergies')
    expect(noneDeclared(state(), 'allergies')).toBe(true)
    state().toggle('allergies', 'egg')
    expect(noneDeclared(state(), 'allergies')).toBe(false)
  })

  it('require both safety questions before a draft may be saved', () => {
    state().declareNone('allergies')
    expect(allAnswered(state())).toBe(false)
    state().toggle('injuries', 'knee')
    expect(allAnswered(state())).toBe(true)
  })
})
