import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import {
  Card, Divider, ListRow, Meter, Row, Screen, Section, Segmented, Stat, SwitchRow,
} from '../../components/ui'
import { authenticate, lockAvailable } from '../../lib/auth/deviceLock'
import { signOut, useSession } from '../../lib/auth/session'
import { usePlan, useProfile, useSessionsThisWeek } from '../../lib/data/queries'
import { space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { useOnboarding } from '../../lib/store/onboarding'
import { useSettings, type ThemePreference } from '../../lib/store/settings'

export default function ProfileTab() {
  const { t, locale } = useT()
  const { data: profile } = useProfile()
  const { data: plan } = usePlan()
  const { data: sessions } = useSessionsThisWeek()
  const { data: session } = useSession()
  const { lockEnabled, setLockEnabled, setUnlocked, setLocale, theme, setTheme } = useSettings()
  const [canLock, setCanLock] = useState(false)

  useEffect(() => {
    void lockAvailable().then(setCanLock)
  }, [])

  // Turning the lock on proves it can be turned off again first. Enabling it
  // without a successful authentication is how someone locks themselves out of
  // their own data on the next launch.
  async function toggleLock() {
    if (!(await authenticate(t('lock.prompt')))) return
    setLockEnabled(!lockEnabled)
    setUnlocked(true)
  }

  const done = sessions?.length ?? 0
  const target = plan?.days.length ?? profile?.daysPerWeek ?? 3

  return (
    <Screen>
      <Card>
        <Stat label={t('profile.northStar')} value={`${done} / ${target}`} />
        <Meter value={done} max={target} label={t('today.weekProgress', { done, target })} />
      </Card>

      {profile ? (
        <Card>
          <Row style={{ gap: space.lg }}>
            <View style={{ flex: 1 }}>
              <Stat size="small" label={t('onboarding.weight')} value={profile.weightKg} unit={t('common.kg')} />
            </View>
            <View style={{ flex: 1 }}>
              <Stat size="small" label={t('onboarding.height')} value={profile.heightCm} unit={t('common.cm')} />
            </View>
            <View style={{ flex: 1 }}>
              <Stat size="small" label={t('onboarding.age')} value={profile.age} unit={t('common.year')} />
            </View>
          </Row>
        </Card>
      ) : null}

      <Section title={t('profile.settings')}>
        <Segmented
          label={t('common.language')}
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
          value={locale}
          onChange={setLocale}
        />
        <Segmented<ThemePreference>
          label={t('profile.theme')}
          options={[
            { value: 'system', label: t('profile.themeSystem') },
            { value: 'light', label: t('profile.themeLight') },
            { value: 'dark', label: t('profile.themeDark') },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </Section>

      <Section title={t('profile.title')}>
        <Card style={{ paddingVertical: space.xs }}>
          <ListRow
            label={t('profile.edit')}
            onPress={() => {
              // The draft is in memory only. Without this, after a restart it holds
              // the defaults and saving it writes allergies: [] over the real ones.
              if (profile) useOnboarding.getState().hydrate(profile)
              router.push('/(onboarding)/basics')
            }}
          />
          <Divider />
          <ListRow label={t('profile.privacy')} onPress={() => router.push('/privacy')} />
          {/* Hidden where the platform cannot honour it. A switch that stores a
              boolean and locks nothing is worse than no switch. It also says
              what it does and no more: a device lock is not encryption of the
              rows on the server, and claiming otherwise would be a lie a user
              might rely on. */}
          {canLock ? (
            <>
              <Divider />
              <SwitchRow
                label={t('profile.lock')}
                detail={t('profile.lockBody')}
                value={lockEnabled}
                onValueChange={() => void toggleLock()}
              />
            </>
          ) : null}
          {session?.userId ? (
            <>
              <Divider />
              <ListRow
                label={t('profile.signOut')}
                onPress={async () => {
                  await signOut()
                  router.replace('/')
                }}
              />
            </>
          ) : null}
        </Card>
      </Section>
    </Screen>
  )
}
