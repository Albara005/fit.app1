import { router } from 'expo-router'
import { StepProgress } from '../../components/StepProgress'
import { Body, Button, Caption, Choice, Screen, Title } from '../../components/ui'
import { useT } from '../../lib/i18n/useT'
import { INJURIES, noneDeclared, useOnboarding } from '../../lib/store/onboarding'

export default function InjuriesStep() {
  const { t } = useT()
  const draft = useOnboarding()
  const { injuries, toggle, answered, declareNone } = draft

  return (
    <Screen
      footer={
        <>
          {/* Says why Next is waiting. A disabled button with no reason reads as broken. */}
          {!answered.injuries ? <Caption>{t('onboarding.answerToContinue')}</Caption> : null}
          <Button
            label={t('common.next')}
            disabled={!answered.injuries}
            onPress={() => router.push('/(onboarding)/allergies')}
          />
        </>
      }
    >
      <StepProgress step={5} />
      <Title>{t('onboarding.injuriesTitle')}</Title>
      <Body muted>{t('onboarding.injuriesBody')}</Body>
      <Choice
        mode="multi"
        label={t('onboarding.injuriesNone')}
        selected={noneDeclared(draft, 'injuries')}
        onPress={() => declareNone('injuries')}
      />
      {INJURIES.map((value) => (
        <Choice
          key={value}
          mode="multi"
          label={t(`injury.${value}`)}
          selected={injuries.includes(value)}
          onPress={() => toggle('injuries', value)}
        />
      ))}
    </Screen>
  )
}
