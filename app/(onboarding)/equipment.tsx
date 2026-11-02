import { router } from 'expo-router'
import { StepProgress } from '../../components/StepProgress'
import { Body, Button, Choice, Screen, Title } from '../../components/ui'
import { useT } from '../../lib/i18n/useT'
import { EQUIPMENT, useOnboarding } from '../../lib/store/onboarding'

const KEY: Record<string, string> = {
  none: 'None', bands: 'Bands', dumbbell: 'Dumbbell', barbell: 'Barbell',
  machine: 'Machine', cable: 'Cable', cardio: 'Cardio',
}

export default function EquipmentStep() {
  const { t } = useT()
  const { equipment, toggle } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} onPress={() => router.push('/(onboarding)/injuries')} />}>
      <StepProgress step={4} />
      <Title>{t('onboarding.equipmentTitle')}</Title>
      <Body muted>{t('onboarding.equipmentBody')}</Body>
      {EQUIPMENT.map((value) => (
        <Choice
          key={value}
          mode="multi"
          label={t(`onboarding.equip${KEY[value]}`)}
          selected={equipment.includes(value)}
          onPress={() => toggle('equipment', value)}
        />
      ))}
    </Screen>
  )
}
