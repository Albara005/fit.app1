import { router } from 'expo-router'
import { Body, Button, Chip, Screen, SectionTitle, Spacer, Title, Wrap } from '../../components/ui'
import { Steps } from '../../components/Steps'
import { useT } from '../../lib/i18n/useT'
import { ALLERGENS, DIETS, useOnboarding } from '../../lib/store/onboarding'
import { space } from '../../lib/theme'

const DIET_KEY: Record<string, string> = {
  vegetarian: 'Vegetarian', vegan: 'Vegan', no_red_meat: 'NoRedMeat',
  low_carb: 'LowCarb', diabetic: 'Diabetic',
}

export default function AllergiesStep() {
  const { t } = useT()
  const { allergies, dietary, toggle, answered, declareNone } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} disabled={!answered.allergies} onPress={() => router.push('/(onboarding)/consent')} />}>
      <Steps current={6} total={8} />
      <Title>{t('onboarding.allergiesTitle')}</Title>
      <Body>{t('onboarding.allergiesBody')}</Body>
      <Spacer size={space.sm} />
      <Wrap>
        <Chip
          label={t('onboarding.allergiesNone')}
          selected={answered.allergies && allergies.length === 0}
          onPress={() => declareNone('allergies')}
        />
        {ALLERGENS.map((value) => (
          <Chip
            key={value}
            label={t(`allergen.${value}`)}
            selected={allergies.includes(value)}
            onPress={() => toggle('allergies', value)}
          />
        ))}
      </Wrap>

      <Spacer size={space.md} />
      <SectionTitle>{t('onboarding.dietTitle')}</SectionTitle>
      <Wrap>
        {DIETS.map((value) => (
          <Chip
            key={value}
            label={t(`onboarding.diet${DIET_KEY[value]}`)}
            selected={dietary.includes(value)}
            onPress={() => toggle('dietary', value)}
          />
        ))}
      </Wrap>
    </Screen>
  )
}
