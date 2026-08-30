/**
 * When a notification is worth sending, kept free of any platform import so the
 * rule can be tested as a rule.
 */
export type Presence = 'active' | 'away'

export interface NotifyDecision {
  send: boolean
  reason: 'away' | 'watching' | 'no_permission' | 'unsupported'
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported'

/**
 * Only notifies someone who cannot already see the answer. A banner over the
 * screen you are looking at is noise, and the tab badge already covers that
 * case — this exists for the person who took the app at its word and closed it.
 */
export function shouldNotify(presence: Presence, permission: PermissionState): NotifyDecision {
  if (permission === 'unsupported') return { send: false, reason: 'unsupported' }
  if (permission !== 'granted') return { send: false, reason: 'no_permission' }
  if (presence === 'active') return { send: false, reason: 'watching' }
  return { send: true, reason: 'away' }
}

/**
 * Notification copy carries no health data — not a calorie figure, not a
 * weight, not a meal. It lands on a lock screen a stranger can read, which is
 * the one place the guide's logging rule matters most.
 */
export function isCopySafe(text: string): boolean {
  return !/\d/.test(text)
}
