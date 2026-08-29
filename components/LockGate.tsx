import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { AppState, StyleSheet, View } from 'react-native'
import { PeakMark } from './Brand'
import { Body, Button, Screen, Spacer, Title } from './ui'
import { authenticate, lockAvailable } from '../lib/auth/deviceLock'
import { useT } from '../lib/i18n/useT'
import { useSettings } from '../lib/store/settings'
import { space } from '../lib/theme'

/**
 * Stands between the app and its screens while the lock is on. It renders
 * nothing at all when the lock is off, so the common path pays nothing for it.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const { t } = useT()
  const { lockEnabled, unlocked, setUnlocked, setLockEnabled } = useSettings()
  const [asking, setAsking] = useState(false)

  const unlock = useCallback(async () => {
    if (asking) return
    setAsking(true)
    const ok = await authenticate(t('lock.prompt'))
    setAsking(false)
    if (ok) setUnlocked(true)
  }, [asking, setUnlocked, t])

  // A lock that was enabled on a phone whose biometrics were later removed
  // would lock its owner out permanently. Turning it off is the safe answer.
  useEffect(() => {
    if (!lockEnabled) return
    void lockAvailable().then((available) => {
      if (!available) {
        setLockEnabled(false)
        setUnlocked(true)
      }
    })
  }, [lockEnabled, setLockEnabled, setUnlocked])

  useEffect(() => {
    if (lockEnabled && !unlocked) void unlock()
    // Only on the transition into a locked state; re-prompting on every render
    // would stack system dialogs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockEnabled, unlocked])

  // Re-lock when the app goes to the background: a lock that only applies at
  // cold start is a lock that never applies.
  useEffect(() => {
    if (!lockEnabled) return
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setUnlocked(false)
    })
    return () => sub.remove()
  }, [lockEnabled, setUnlocked])

  if (!lockEnabled || unlocked) return <>{children}</>

  return (
    <Screen footer={<Button label={t('lock.unlock')} loading={asking} onPress={unlock} />}>
      <View style={s.center}>
        <PeakMark size={64} />
        <Spacer size={space.lg} />
        <Title>{t('lock.title')}</Title>
        <Body>{t('lock.body')}</Body>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs },
})
