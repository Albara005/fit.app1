import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Wordmark } from '../../components/Brand'
import { Body, Button, Display, Screen, Small, Spacer } from '../../components/ui'
import { useT } from '../../lib/i18n/useT'
import { useSettings } from '../../lib/store/settings'
import { colors, radius, space, type } from '../../lib/theme'

export default function Welcome() {
  const { t, locale } = useT()
  const setLocale = useSettings((s) => s.setLocale)

  return (
    <Screen
      footer={
        <>
          <Button label={t('onboarding.welcomeCta')} onPress={() => router.push('/(onboarding)/basics')} />
          <Small style={s.center}>{t('onboarding.welcomeMinutes')}</Small>
        </>
      }
    >
      <View style={s.head}>
        <Wordmark size={44} />
        <View style={s.langRow}>
          {(['ar', 'en'] as const).map((code) => (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected: locale === code }}
              onPress={() => setLocale(code)}
              style={[s.lang, locale === code && s.langOn]}
            >
              <Text style={[s.langText, locale === code && s.langTextOn]}>
                {code === 'ar' ? 'عربي' : 'EN'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Spacer size={space.xxl} />
      <Display>{t('onboarding.welcomeTitle')}</Display>
      <Spacer size={space.sm} />
      <Body>{t('onboarding.welcomeBody')}</Body>

      <Spacer size={space.xl} />
      <View style={s.loops}>
        {[
          { k: 'today.checkInTitle', v: '10s' },
          { k: 'review.title', v: '2m' },
          { k: 'phase.title', v: '6–8w' },
        ].map((loop) => (
          <View key={loop.k} style={s.loop}>
            <Text style={s.loopValue}>{loop.v}</Text>
            <Small>{t(loop.k)}</Small>
          </View>
        ))}
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  langRow: { flexDirection: 'row', gap: space.xs },
  lang: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  langOn: { borderColor: colors.lime, backgroundColor: colors.limeSoft },
  langText: { ...type.small, color: colors.textMute },
  langTextOn: { color: colors.lime, fontWeight: '700' },
  loops: { flexDirection: 'row', gap: space.md },
  loop: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 2,
  },
  loopValue: { ...type.heading, color: colors.lime },
  center: { alignSelf: 'center' },
})
