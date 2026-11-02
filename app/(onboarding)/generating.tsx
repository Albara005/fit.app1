import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Body, Button, Caption, Card, CoachLine, Screen, Title } from '../../components/ui'
import { useDerivedProfile, useGeneratePlan, useSaveProfile } from '../../lib/data/queries'
import { useTheme } from '../../lib/design/theme'
import { space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { requestPermission } from '../../lib/notifications'

/**
 * Generation runs as a job the user can walk away from. There is no blocking
 * spinner over the whole app and no error state: if the model is slow, refuses,
 * or is not configured at all, the rules-based plan lands here instead.
 */
export default function Generating() {
  const { t, locale } = useT()
  const { p } = useTheme()
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
      <Screen center>
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
        center
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
        <Title>{t('onboarding.underweightTitle')}</Title>
        <CoachLine>{t('onboarding.underweightBody')}</CoachLine>
      </Screen>
    )
  }

  if (outcome?.plan) {
    return (
      <Screen center footer={<Button label={t('common.start')} onPress={() => router.replace('/(tabs)/today')} />}>
        <Title>{t('plan.week', { index: 1 })}</Title>
        <CoachLine>{outcome.plan.rationale[locale]}</CoachLine>
        {outcome.fellBack ? <Caption>{t('safety.templateFallback')}</Caption> : null}
      </Screen>
    )
  }

  return (
    <Screen
      center
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
      <View style={{ alignItems: 'center', gap: space.md }}>
        <ActivityIndicator color={p.accent} size="large" />
        <Title>{t('onboarding.generatingTitle')}</Title>
        <Body muted>{t('onboarding.generatingBody')}</Body>
      </View>
    </Screen>
  )
}
