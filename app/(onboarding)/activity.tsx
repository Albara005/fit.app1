import { router } from 'expo-router'
import { Body, Button, Chip, Screen, SectionTitle, Spacer, Stepper, Title, Wrap } from '../../components/ui'
import { Steps } from '../../components/Steps'
import { useT } from '../../lib/i18n/useT'
import { ACTIVITIES, useOnboarding } from '../../lib/store/onboarding'
import { space } from '../../lib/theme'

const KEY: Record<string, string> = {
  sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate',
  active: 'Active', very_active: 'VeryActive',
}

export default function ActivityStep() {
  const { t } = useT()
  const { activity, daysPerWeek, set } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} onPress={() => router.push('/(onboarding)/equipment')} />}>
      <Steps current={3} total={8} />
      <Title>{t('onboarding.activityTitle')}</Title>
      <Spacer size={space.xs} />
      <Wrap>
        {ACTIVITIES.map((value) => (
          <Chip
            key={value}
            label={t(`onboarding.activity${KEY[value]}`)}
            selected={activity === value}
            onPress={() => set('activity', value)}
          />
        ))}
      </Wrap>

      <Spacer size={space.md} />
      <SectionTitle>{t('onboarding.daysTitle')}</SectionTitle>
      <Body>{t('onboarding.daysBody')}</Body>
      <Spacer size={space.xs} />
      <Stepper
        value={daysPerWeek}
        onChange={(v) => set('daysPerWeek', v)}
        min={1}
        max={6}
        suffix={t('onboarding.daysUnit')}
      />
    </Screen>
  )
}
