import { router } from 'expo-router'
import { StepProgress } from '../../components/StepProgress'
import { Body, Button, Screen, Section, Segmented, Stepper, Title } from '../../components/ui'
import { useT } from '../../lib/i18n/useT'
import { SEXES, useOnboarding } from '../../lib/store/onboarding'

export default function Basics() {
  const { t } = useT()
  const { age, sex, heightCm, weightKg, set } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} onPress={() => router.push('/(onboarding)/goal')} />}>
      <StepProgress step={1} />
      <Title>{t('onboarding.basicsTitle')}</Title>
      <Body muted>{t('onboarding.basicsBody')}</Body>

      <Section title={t('onboarding.sex')}>
        <Segmented
          label={t('onboarding.sex')}
          options={SEXES.map((value) => ({
            value,
            label: t(value === 'm' ? 'onboarding.male' : 'onboarding.female'),
          }))}
          value={sex}
          onChange={(value) => set('sex', value)}
        />
      </Section>
      <Section title={t('onboarding.age')}>
        <Stepper label={t('onboarding.age')} value={age} onChange={(v) => set('age', v)} min={18} max={90} unit={t('common.year')} />
      </Section>
      <Section title={t('onboarding.height')}>
        <Stepper
          label={t('onboarding.height')}
          value={heightCm}
          onChange={(v) => set('heightCm', v)}
          min={130}
          max={220}
          unit={t('common.cm')}
        />
      </Section>
      <Section title={t('onboarding.weight')}>
        <Stepper
          label={t('onboarding.weight')}
          value={weightKg}
          onChange={(v) => set('weightKg', v)}
          min={35}
          max={250}
          step={0.5}
          unit={t('common.kg')}
        />
      </Section>
    </Screen>
  )
}
