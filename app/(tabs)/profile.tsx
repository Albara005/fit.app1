import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Body, Card, Divider, Row, Screen, SectionTitle, Small, Spacer, Stat, Title,
} from '../../components/ui'
import { authenticate, lockAvailable } from '../../lib/auth/deviceLock'
import { signOut, useSession } from '../../lib/auth/session'
import { useProfile, useSessionsThisWeek } from '../../lib/data/queries'
import { useT } from '../../lib/i18n/useT'
import { useSettings } from '../../lib/store/settings'
import { colors, radius, space, type } from '../../lib/theme'
import type { Locale } from '../../lib/types'

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.link, pressed && s.pressed]}>
      <Text style={s.linkText}>{label}</Text>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  )
}

export default function ProfileTab() {
  const { t, locale } = useT()
  const { data: profile } = useProfile()
  const { data: sessions } = useSessionsThisWeek()
  const { data: session } = useSession()
  const { lockEnabled, setLockEnabled, setUnlocked, setLocale } = useSettings()
  const [canLock, setCanLock] = useState(false)

  useEffect(() => {
    void lockAvailable().then(setCanLock)
  }, [])

  // Turning the lock on proves it can be turned off again first. Enabling it
  // without a successful authentication is how someone locks themselves out of
  // their own data on the next launch.
  async function toggleLock() {
    if (lockEnabled) {
      if (!(await authenticate(t('lock.prompt')))) return
      setLockEnabled(false)
      setUnlocked(true)
      return
    }
    if (!(await authenticate(t('lock.prompt')))) return
    setLockEnabled(true)
    setUnlocked(true)
  }

  return (
    <Screen>
      <Card tone="accent">
        <Stat label={t('profile.northStar')} value={sessions?.length ?? 0} />
        <Small>{t('review.adherence')}</Small>
      </Card>

      {profile ? (
        <Card>
          <Row>
            <Stat label={t('onboarding.weight')} value={profile.weightKg} unit={t('common.kg')} />
            <View style={s.grow} />
            <Stat label={t('onboarding.height')} value={profile.heightCm} unit={t('common.cm')} />
            <View style={s.grow} />
            <Stat label={t('onboarding.age')} value={profile.age} />
          </Row>
        </Card>
      ) : null}

      <SectionTitle>{t('common.language')}</SectionTitle>
      <Row>
        {(['ar', 'en'] as Locale[]).map((code) => (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: locale === code }}
            onPress={() => setLocale(code)}
            style={[s.lang, locale === code && s.langOn]}
          >
            <Text style={[s.langText, locale === code && s.langTextOn]}>
              {code === 'ar' ? 'العربية' : 'English'}
            </Text>
          </Pressable>
        ))}
      </Row>

      <SectionTitle>{t('profile.title')}</SectionTitle>
      <Card style={s.links}>
        <LinkRow label={t('profile.edit')} onPress={() => router.push('/(onboarding)/basics')} />
        <Divider />
        <LinkRow label={t('profile.privacy')} onPress={() => router.push('/privacy')} />
        {session?.userId ? (
          <>
            <Divider />
            <LinkRow
              label={t('profile.signOut')}
              onPress={async () => {
                await signOut()
                router.replace('/')
              }}
            />
          </>
        ) : null}
        {/* Hidden where the platform cannot honour it. A switch that stores a
            boolean and locks nothing is worse than no switch. */}
        {canLock ? (
          <>
            <Divider />
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: lockEnabled }}
              onPress={toggleLock}
              style={s.link}
            >
              <View style={s.grow}>
                <Text style={s.linkText}>{t('profile.lock')}</Text>
                {/* Says what it does and no more: a device lock is not
                    encryption of the rows on the server, and claiming
                    otherwise would be a lie a user might rely on. */}
                <Small>{t('profile.lockBody')}</Small>
              </View>
              <View style={[s.toggle, lockEnabled && s.toggleOn]}>
                <View style={[s.knob, lockEnabled && s.knobOn]} />
              </View>
            </Pressable>
          </>
        ) : null}
      </Card>
      <Spacer size={space.md} />
    </Screen>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  links: { paddingVertical: space.xs },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  pressed: { opacity: 0.6 },
  linkText: { ...type.body, color: colors.text, flexShrink: 1 },
  chevron: { ...type.title, color: colors.textFaint, marginStart: 'auto' },
  lang: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  langOn: { borderColor: colors.lime, backgroundColor: colors.limeSoft },
  langText: { ...type.body, color: colors.textMute },
  langTextOn: { color: colors.lime, fontWeight: '700' },
  toggle: {
    width: 48, height: 28, borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt, padding: 3, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.lime },
  knob: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.textFaint },
  knobOn: { backgroundColor: colors.bg, alignSelf: 'flex-end' },
})
