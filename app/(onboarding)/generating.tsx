import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Body, Button, Card, Screen, Small, Spacer, Title } from '../../components/ui'
import { useDerivedProfile, useGeneratePlan, useSaveProfile } from '../../lib/data/queries'
import { requestPermission } from '../../lib/notifications'
import { useT } from '../../lib/i18n/useT'
import { colors, space } from '../../lib/theme'

/**
 * Generation runs as a job the user can walk away from. There is no blocking
 * spinner over the whole app and no error state: if the model is slow, refuses,
 * or is not configured at all, the rules-based plan lands here instead.
 */
export default function Generating() {
  const { t, locale } = useT()
  const profile = useDerivedProfile()
  const generate = useGeneratePlan()
  const saveProfile = useSaveProfile()
  const started = useRef(false)

  useEffect(() => {
    if (!profile || started.current) return
    started.current = true
    generate.mutate({ profile, weekIndex: 0 })
  }, [profile, generate])

  const outcome = generate.data

  if (outcome?.verdict === 'BLOCK_ACCOUNT') {
    return (
      <Screen>
        <Spacer size={space.xxl} />
        <Card tone="danger">
          <Title>{t('onboarding.blockedTitle')}</Title>
          <Body>{t('onboarding.blockedBody')}</Body>
        </Card>
      </Screen>
    )
  }

  if (outcome?.verdict === 'OFFER_ALTERNATIVE' && profile) {
    return (
      <Screen
        footer={
          <Button
            label={t('onboarding.underweightCta')}
            loading={generate.isPending || saveProfile.isPending}
            onPress={async () => {
              const gaining = { ...profile, goal: 'gain' as const }
              await saveProfile.mutateAsync(gaining)
              await generate.mutateAsync({ profile: gaining, weekIndex: 0 })
              router.replace('/(tabs)/today')
            }}
          />
        }
      >
        <Spacer size={space.xxl} />
        <Card tone="accent">
          <Title>{t('onboarding.underweightTitle')}</Title>
          <Body>{t('onboarding.underweightBody')}</Body>
        </Card>
      </Screen>
    )
  }

  if (outcome?.plan) {
    return (
      <Screen footer={<Button label={t('common.start')} onPress={() => router.replace('/(tabs)/today')} />}>
        <Spacer size={space.xxl} />
        <Title>{t('plan.week', { index: 1 })}</Title>
        <Body>{outcome.plan.rationale[locale]}</Body>
        {outcome.fellBack ? (
          <Card>
            <Small>{t('safety.templateFallback')}</Small>
          </Card>
        ) : null}
      </Screen>
    )
  }

  return (
    <Screen
      footer={
        <Button
          label={t('onboarding.generatingLeave')}
          variant="secondary"
          onPress={async () => {
            // Asked here rather than at launch: this is the one moment the
            // value is self-evident, because the user is in the act of
            // leaving something unfinished. A refusal costs nothing — the
            // plan still lands and the tab badge still shows it.
            await requestPermission().catch(() => undefined)
            router.replace('/(tabs)/today')
          }}
        />
      }
    >
      <View style={s.center}>
        <ActivityIndicator color={colors.lime} size="large" />
        <Spacer size={space.lg} />
        <Title>{t('onboarding.generatingTitle')}</Title>
        <Body>{t('onboarding.generatingBody')}</Body>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs },
})
