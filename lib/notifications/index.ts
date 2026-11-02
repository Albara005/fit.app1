import { AppState, Platform } from 'react-native'
import type { PermissionState, Presence } from './policy'
import { isCopySafe, shouldNotify } from './policy'

export * from './policy'

/**
 * One interface, two real implementations.
 *
 * expo-notifications handles native. On the web its scheduler is a no-op stub,
 * so the browser's own Notification API does the work there — a library call
 * that silently does nothing is worse than no notification, because it looks
 * like it worked.
 */

function webNotification(): typeof Notification | null {
  if (Platform.OS !== 'web') return null
  return typeof globalThis.Notification === 'undefined' ? null : globalThis.Notification
}

export async function getPermission(): Promise<PermissionState> {
  const web = webNotification()
  if (Platform.OS === 'web') {
    if (!web) return 'unsupported'
    return web.permission === 'default' ? 'undetermined' : (web.permission as PermissionState)
  }

  const Notifications = await import('expo-notifications')
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined'
}

export async function requestPermission(): Promise<PermissionState> {
  const web = webNotification()
  if (Platform.OS === 'web') {
    if (!web) return 'unsupported'
    const result = await web.requestPermission()
    return result === 'default' ? 'undetermined' : (result as PermissionState)
  }

  const Notifications = await import('expo-notifications')
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined'
}

function presence(): Presence {
  if (Platform.OS === 'web') {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden' ? 'away' : 'active'
  }
  return AppState.currentState === 'active' ? 'active' : 'away'
}

/**
 * Sends only to someone who cannot already see the answer. Returns whether it
 * sent, so a caller can fall back to the in-app badge without guessing.
 */
export async function notifyIfAway(title: string, body: string): Promise<boolean> {
  if (!isCopySafe(title) || !isCopySafe(body)) {
    // A number in a notification is a number on a lock screen.
    if (__DEV__) console.warn('[notifications] refused copy containing digits')
    return false
  }

  const decision = shouldNotify(presence(), await getPermission())
  if (!decision.send) return false

  if (Platform.OS === 'web') {
    const web = webNotification()
    if (!web) return false
    new web(title, { body, tag: 'peak-plan-ready' })
    return true
  }

  const Notifications = await import('expo-notifications')
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  })
  return true
}
