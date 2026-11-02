import { router } from 'expo-router'
import { Body, Button, Chip, Screen, Spacer, Title, Wrap } from '../../components/ui'
import { Steps } from '../../components/Steps'
import { useT } from '../../lib/i18n/useT'
import { INJURIES, useOnboarding } from '../../lib/store/onboarding'
import { space } from '../../lib/theme'

export default function InjuriesStep() {
  const { t } = useT()
  const { injuries, toggle, answered, declareNone } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} disabled={!answered.injuries} onPress={() => router.push('/(onboarding)/allergies')} />}>
      <Steps current={5} total={8} />
      <Title>{t('onboarding.injuriesTitle')}</Title>
      <Body>{t('onboarding.injuriesBody')}</Body>
      <Spacer size={space.sm} />
      <Wrap>
        <Chip
          label={t('onboarding.injuriesNone')}
          selected={answered.injuries && injuries.length === 0}
          onPress={() => declareNone('injuries')}
        />
        {INJURIES.map((value) => (
          <Chip
            key={value}
            label={t(`injury.${value}`)}
            selected={injuries.includes(value)}
            onPress={() => toggle('injuries', value)}
          />
        ))}
      </Wrap>
    </Screen>
  )
}
