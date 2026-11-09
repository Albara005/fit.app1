import { router } from 'expo-router'
import { StepProgress } from '../../components/StepProgress'
import { Body, Button, Choice, Screen, Title } from '../../components/ui'
import { useT } from '../../lib/i18n/useT'
import { GOALS, useOnboarding } from '../../lib/store/onboarding'

const LABEL: Record<string, string> = { cut: 'Cut', recomp: 'Recomp', gain: 'Gain', strength: 'Strength' }

export default function GoalStep() {
  const { t } = useT()
  const { goal, set } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} onPress={() => router.push('/(onboarding)/activity')} />}>
      <StepProgress step={2} />
      <Title>{t('onboarding.goalTitle')}</Title>
      <Body muted>{t('onboarding.goalBody')}</Body>
      {GOALS.map((value) => (
        <Choice
          key={value}
          mode="single"
          label={t(`onboarding.goal${LABEL[value]}`)}
          description={t(`onboarding.goal${LABEL[value]}Body`)}
          selected={goal === value}
          onPress={() => set('goal', value)}
        />
      ))}
    </Screen>
  )
}
