import { router } from 'expo-router'
import { StepProgress } from '../../components/StepProgress'
import { Body, Button, Choice, Screen, Section, Stepper, Title } from '../../components/ui'
import { useT } from '../../lib/i18n/useT'
import { ACTIVITIES, useOnboarding } from '../../lib/store/onboarding'

const KEY: Record<string, string> = {
  sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active', very_active: 'VeryActive',
}

export default function ActivityStep() {
  const { t } = useT()
  const { activity, daysPerWeek, set } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} onPress={() => router.push('/(onboarding)/equipment')} />}>
      <StepProgress step={3} />
      <Title>{t('onboarding.activityTitle')}</Title>
      {ACTIVITIES.map((value) => (
        <Choice
          key={value}
          mode="single"
          label={t(`onboarding.activity${KEY[value]}`)}
          selected={activity === value}
          onPress={() => set('activity', value)}
        />
      ))}

      <Section title={t('onboarding.daysTitle')}>
        <Body muted>{t('onboarding.daysBody')}</Body>
        <Stepper
          label={t('onboarding.daysTitle')}
          value={daysPerWeek}
          onChange={(v) => set('daysPerWeek', v)}
          min={1}
          max={6}
          unit={t('onboarding.daysUnit')}
        />
      </Section>
    </Screen>
  )
}
