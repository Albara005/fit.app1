import { router } from 'expo-router'
import { Body, Button, Chip, Screen, Spacer, Title, Wrap } from '../../components/ui'
import { Steps } from '../../components/Steps'
import { useT } from '../../lib/i18n/useT'
import { GOALS, useOnboarding } from '../../lib/store/onboarding'
import { space } from '../../lib/theme'

const LABEL: Record<string, string> = {
  cut: 'Cut', recomp: 'Recomp', gain: 'Gain', strength: 'Strength',
}

export default function GoalStep() {
  const { t } = useT()
  const { goal, set } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} onPress={() => router.push('/(onboarding)/activity')} />}>
      <Steps current={2} total={8} />
      <Title>{t('onboarding.goalTitle')}</Title>
      <Body>{t('onboarding.goalBody')}</Body>
      <Spacer size={space.sm} />
      <Wrap>
        {GOALS.map((value) => (
          <Chip
            key={value}
            label={t(`onboarding.goal${LABEL[value]}`)}
            sublabel={t(`onboarding.goal${LABEL[value]}Body`)}
            selected={goal === value}
            wide
            onPress={() => set('goal', value)}
          />
        ))}
      </Wrap>
    </Screen>
  )
}
