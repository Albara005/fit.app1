import { router } from 'expo-router'
import { StepProgress } from '../../components/StepProgress'
import { Body, Button, Caption, Choice, Screen, Section, Title } from '../../components/ui'
import { useT } from '../../lib/i18n/useT'
import { ALLERGENS, DIETS, noneDeclared, useOnboarding } from '../../lib/store/onboarding'

const DIET_KEY: Record<string, string> = {
  vegetarian: 'Vegetarian', vegan: 'Vegan', no_red_meat: 'NoRedMeat', low_carb: 'LowCarb', diabetic: 'Diabetic',
}

export default function AllergiesStep() {
  const { t } = useT()
  const draft = useOnboarding()
  const { allergies, dietary, toggle, answered, declareNone } = draft

  return (
    <Screen
      footer={
        <>
          {!answered.allergies ? <Caption>{t('onboarding.answerToContinue')}</Caption> : null}
          <Button
            label={t('common.next')}
            disabled={!answered.allergies}
            onPress={() => router.push('/(onboarding)/consent')}
          />
        </>
      }
    >
      <StepProgress step={6} />
      <Title>{t('onboarding.allergiesTitle')}</Title>
      <Body muted>{t('onboarding.allergiesBody')}</Body>
      <Choice
        mode="multi"
        label={t('onboarding.allergiesNone')}
        selected={noneDeclared(draft, 'allergies')}
        onPress={() => declareNone('allergies')}
      />
      {ALLERGENS.map((value) => (
        <Choice
          key={value}
          mode="multi"
          label={t(`allergen.${value}`)}
          selected={allergies.includes(value)}
          onPress={() => toggle('allergies', value)}
        />
      ))}

      <Section title={t('onboarding.dietTitle')}>
        {DIETS.map((value) => (
          <Choice
            key={value}
            mode="multi"
            label={t(`onboarding.diet${DIET_KEY[value]}`)}
            selected={dietary.includes(value)}
            onPress={() => toggle('dietary', value)}
          />
        ))}
      </Section>
    </Screen>
  )
}
