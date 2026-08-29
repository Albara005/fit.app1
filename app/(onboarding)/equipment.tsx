import { router } from 'expo-router'
import { Body, Button, Chip, Screen, Spacer, Title, Wrap } from '../../components/ui'
import { Steps } from '../../components/Steps'
import { useT } from '../../lib/i18n/useT'
import { EQUIPMENT, useOnboarding } from '../../lib/store/onboarding'
import { space } from '../../lib/theme'

const KEY: Record<string, string> = {
  none: 'None', bands: 'Bands', dumbbell: 'Dumbbell', barbell: 'Barbell',
  machine: 'Machine', cable: 'Cable', cardio: 'Cardio',
}

export default function EquipmentStep() {
  const { t } = useT()
  const { equipment, toggle } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} onPress={() => router.push('/(onboarding)/injuries')} />}>
      <Steps current={4} total={8} />
      <Title>{t('onboarding.equipmentTitle')}</Title>
      <Body>{t('onboarding.equipmentBody')}</Body>
      <Spacer size={space.sm} />
      <Wrap>
        {EQUIPMENT.map((value) => (
          <Chip
            key={value}
            label={t(`onboarding.equip${KEY[value]}`)}
            selected={equipment.includes(value)}
            onPress={() => toggle('equipment', value)}
          />
        ))}
      </Wrap>
    </Screen>
  )
}
