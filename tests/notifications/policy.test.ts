import { describe, expect, it } from 'vitest'
import { isCopySafe, shouldNotify, type PermissionState } from '../../lib/notifications/policy'
import ar from '../../locales/ar.json'
import en from '../../locales/en.json'

describe('shouldNotify', () => {
  it('notifies someone who left', () => {
    expect(shouldNotify('away', 'granted')).toEqual({ send: true, reason: 'away' })
  })

  it('stays quiet for someone already looking at the app', () => {
    // The tab badge covers this case; a banner over the screen you are on is
    // noise, and noise is how notifications get switched off for good.
    expect(shouldNotify('active', 'granted')).toEqual({ send: false, reason: 'watching' })
  })

  it.each<[PermissionState]>([['denied'], ['undetermined']])(
    'sends nothing on %s permission',
    (permission) => {
      expect(shouldNotify('away', permission).send).toBe(false)
      expect(shouldNotify('away', permission).reason).toBe('no_permission')
    },
  )

  it('distinguishes an unsupported platform from a refusal', () => {
    // A browser with no Notification API is not a user who said no, and the UI
    // should not offer to ask again.
    expect(shouldNotify('away', 'unsupported')).toEqual({ send: false, reason: 'unsupported' })
  })
})

describe('notification copy', () => {
  it('rejects anything carrying a digit', () => {
    expect(isCopySafe('خطتك جاهزة')).toBe(true)
    expect(isCopySafe('Your plan is ready')).toBe(true)
    expect(isCopySafe('2100 kcal this week')).toBe(false)
    expect(isCopySafe('نزلت 3 كجم')).toBe(false)
  })

  it('holds for the strings the app actually sends', () => {
    // A notification lands on a lock screen a stranger can read, which is where
    // the no-health-data-in-logs rule matters most.
    for (const bundle of [ar, en]) {
      const notify = (bundle as { notify: Record<string, string> }).notify
      for (const [key, value] of Object.entries(notify)) {
        if (key === 'askTitle' || key === 'askBody' || key === 'ask') continue
        expect(isCopySafe(value), `${key}: ${value}`).toBe(true)
      }
    }
  })
})
