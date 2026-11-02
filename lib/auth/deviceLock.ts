import * as LocalAuthentication from 'expo-local-authentication'
import { Platform } from 'react-native'

/**
 * A device lock, and nothing more. It keeps the person next to you out of the
 * app on this handset. It does not encrypt anything, it does not protect the
 * rows on the server, and the UI must never imply that it does — section 7 of
 * the product guide is explicit about that, and it is the kind of claim a user
 * would reasonably rely on.
 */
export async function lockAvailable(): Promise<boolean> {
  // The web has no biometric or passcode API worth the name. Offering the
  // switch there would be a control that silently does nothing.
  if (Platform.OS === 'web') return false
  const hardware = await LocalAuthentication.hasHardwareAsync()
  if (!hardware) return false
  // Hardware without an enrolment cannot authenticate anyone, so the switch
  // would lock the owner out of their own app on the next launch.
  return LocalAuthentication.isEnrolledAsync()
}

export async function authenticate(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return true
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    // Falling back to the device passcode keeps a failed fingerprint from
    // becoming a dead end.
    disableDeviceFallback: false,
    cancelLabel: undefined,
  })
  return result.success
}
