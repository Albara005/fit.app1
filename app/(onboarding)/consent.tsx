import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StepProgress } from '../../components/StepProgress'
import { Body, Button, Choice, Screen, Title } from '../../components/ui'
import { useConsents, useProfile, useSaveProfile, useSetConsent } from '../../lib/data/queries'
import { useT } from '../../lib/i18n/useT'
import { useOnboarding } from '../../lib/store/onboarding'

export default function ConsentStep() {
  const { t } = useT()
  const draft = useOnboarding()
  const { data: saved } = useConsents()
  const { data: profile, isPending: profilePending } = useProfile()
  const saveProfile = useSaveProfile()
  const setConsent = useSetConsent()

  // The draft lives in memory. Reached by a reload on this screen — or by its
  // URL — it holds the defaults with both safety questions unanswered, and
  // saving it would write allergies: [] over the real list. Such a draft is
  // nobody's answers: restore what is saved, if anything, and start over.
  const unanswered = !draft.answered.injuries || !draft.answered.allergies
  useEffect(() => {
    if (!unanswered || profilePending) return
    if (profile) useOnboarding.getState().hydrate(profile)
    router.replace('/(onboarding)/basics')
  }, [unanswered, profilePending, profile])

  // Untouched means "as saved". Starting both at false meant a returning user
  // editing their weight silently revoked the transfer consent they had given.
  // Covers the two consent writes as well as the profile save: a second tap in
  // that window wrote every record twice and started generation twice.
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const [processingChoice, setProcessing] = useState<boolean | null>(null)
  const [transferChoice, setTransfer] = useState<boolean | null>(null)
  const processing = processingChoice ?? saved?.processing ?? false
  const transfer = transferChoice ?? saved?.cross_border_transfer ?? false

  async function accept() {
    // Never relies on the redirect above having fired first.
    if (unanswered || submitting.current) return
    submitting.current = true
    setBusy(true)
    try {
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
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <Screen
      footer={
        <Button
          label={t('consent.accept')}
          disabled={!processing || unanswered}
          loading={busy}
          onPress={accept}
        />
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
