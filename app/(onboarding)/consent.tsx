import { router } from 'expo-router'
import { useState } from 'react'
import { StepProgress } from '../../components/StepProgress'
import { Body, Button, Choice, Screen, Title } from '../../components/ui'
import { useConsents, useSaveProfile, useSetConsent } from '../../lib/data/queries'
import { useT } from '../../lib/i18n/useT'
import { allAnswered, useOnboarding } from '../../lib/store/onboarding'

export default function ConsentStep() {
  const { t } = useT()
  const draft = useOnboarding()
  const { data: saved } = useConsents()
  const saveProfile = useSaveProfile()
  const setConsent = useSetConsent()
  // A reload here is caught by the onboarding layout; this is the backstop, so
  // an unanswered draft can never be saved whatever route reached this screen.
  const answered = allAnswered(draft)

  // Untouched means "as saved". Starting both at false meant a returning user
  // editing their weight silently revoked the transfer consent they had given.
  const [processingChoice, setProcessing] = useState<boolean | null>(null)
  const [transferChoice, setTransfer] = useState<boolean | null>(null)
  const processing = processingChoice ?? saved?.processing ?? false
  const transfer = transferChoice ?? saved?.cross_border_transfer ?? false

  async function accept() {
    if (!answered) return
    // Two separate records, because they are two separate permissions.
    // Bundling them would make the second one unrefusable in practice.
    await setConsent.mutateAsync({ kind: 'processing', granted: true })
    await setConsent.mutateAsync({ kind: 'cross_border_transfer', granted: transfer })
    await saveProfile.mutateAsync({
      age: draft.age, sex: draft.sex, heightCm: draft.heightCm, weightKg: draft.weightKg,
      goal: draft.goal, activity: draft.activity, daysPerWeek: draft.daysPerWeek,
      equipment: draft.equipment, injuries: draft.injuries, allergies: draft.allergies,
      dietary: draft.dietary,
    })
    router.replace('/(onboarding)/generating')
  }

  return (
    <Screen
      footer={
        // The button runs accept once at a time: a second tap used to write
        // every record twice and start generation twice.
        <Button label={t('consent.accept')} disabled={!processing || !answered} onPress={accept} />
      }
    >
      <StepProgress step={7} />
      <Title>{t('consent.title')}</Title>
      <Body muted>{t('consent.intro')}</Body>

      <Choice
        mode="multi"
        label={t('consent.processing')}
        description={t('consent.processingBody')}
        selected={processing}
        onPress={() => setProcessing(!processing)}
      />
      <Choice
        mode="multi"
        label={t('consent.transfer')}
        description={t('consent.transferBody')}
        selected={transfer}
        onPress={() => setTransfer(!transfer)}
      />

      <Button label={t('consent.readPolicy')} variant="quiet" onPress={() => router.push('/privacy')} />
    </Screen>
  )
}
