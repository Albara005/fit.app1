import { router } from 'expo-router'
import { Body, Button, Chip, Row, Screen, SectionTitle, Spacer, Stepper, Title } from '../../components/ui'
import { Steps } from '../../components/Steps'
import { useT } from '../../lib/i18n/useT'
import { SEXES, useOnboarding } from '../../lib/store/onboarding'
import { space } from '../../lib/theme'

export default function Basics() {
  const { t } = useT()
  const { age, sex, heightCm, weightKg, set } = useOnboarding()

  return (
    <Screen footer={<Button label={t('common.next')} onPress={() => router.push('/(onboarding)/goal')} />}>
      <Steps current={1} total={8} />
      <Title>{t('onboarding.basicsTitle')}</Title>
      <Body>{t('onboarding.basicsBody')}</Body>
      <Spacer size={space.sm} />

      <SectionTitle>{t('onboarding.sex')}</SectionTitle>
      <Row>
        {SEXES.map((value) => (
          <Chip
            key={value}
            label={t(value === 'm' ? 'onboarding.male' : 'onboarding.female')}
            selected={sex === value}
            onPress={() => set('sex', value)}
          />
        ))}
      </Row>

      <SectionTitle>{t('onboarding.age')}</SectionTitle>
      <Stepper value={age} onChange={(v) => set('age', v)} min={18} max={90} suffix={t('common.day')} />

      <SectionTitle>{t('onboarding.height')}</SectionTitle>
      <Stepper value={heightCm} onChange={(v) => set('heightCm', v)} min={130} max={220} suffix="cm" />

      <SectionTitle>{t('onboarding.weight')}</SectionTitle>
      <Stepper
        value={weightKg}
        onChange={(v) => set('weightKg', v)}
        min={35}
        max={250}
        step={0.5}
        suffix={t('common.kg')}
      />
    </Screen>
  )
}
