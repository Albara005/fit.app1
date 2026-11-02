import { Platform, Share } from 'react-native'

export type ShareOutcome = 'shared' | 'copied' | 'unavailable'

/**
 * Share, then clipboard, then give up and say so. Desktop browsers frequently
 * have no share sheet, and a button that silently does nothing is the worst of
 * the three outcomes — the caller renders the text for manual copying when this
 * returns 'unavailable'.
 */
export async function shareOrCopy(title: string, message: string): Promise<ShareOutcome> {
  try {
    await Share.share({ title, message })
    return 'shared'
  } catch {
    // Falls through to the clipboard.
  }

  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(message)
      return 'copied'
    } catch {
      return 'unavailable'
    }
  }

  return 'unavailable'
}
