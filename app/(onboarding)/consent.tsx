import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, Screen, Small, Spacer, Title } from '../../components/ui'
import { Steps } from '../../components/Steps'
import { useSaveProfile, useSetConsent } from '../../lib/data/queries'
import { useT } from '../../lib/i18n/useT'
import { useOnboarding } from '../../lib/store/onboarding'
import { colors, radius, space, type } from '../../lib/theme'

function Check({
  checked, onToggle, title, body,
}: {
  checked: boolean
  onToggle: () => void
  title: string
  body: string
}) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle}>
      <Card tone={checked ? 'accent' : 'default'}>
        <View style={s.row}>
          <View style={[s.box, checked && s.boxOn]}>
            {checked ? <Text style={s.tick}>✓</Text> : null}
          </View>
          <Text style={s.title}>{title}</Text>
        </View>
        <Small style={s.body}>{body}</Small>
      </Card>
    </Pressable>
  )
}

export default function ConsentStep() {
  const { t } = useT()
  const draft = useOnboarding()
  const saveProfile = useSaveProfile()
  const setConsent = useSetConsent()
  const [processing, setProcessing] = useState(false)
  const [transfer, setTransfer] = useState(false)

  async function accept() {
    // Two separate records, because they are two separate permissions. Bundling
    // them would make the second one unrefusable in practice.
    await setConsent.mutateAsync({ kind: 'processing', granted: true })
    await setConsent.mutateAsync({ kind: 'cross_border_transfer', granted: transfer })
    await saveProfile.mutateAsync({
      age: draft.age, sex: draft.sex, heightCm: draft.heightCm, weightKg: draft.weightKg,
      goal: draft.goal, activity: draft.activity, daysPerWeek: draft.daysPerWeek,
      equipment: draft.equipment, injuries: draft.injuries, allergies: draft.allergies,
      dietary: draft.dietary, locale: 'ar',
    })
    router.replace('/(onboarding)/generating')
  }

  return (
    <Screen
      footer={
        <Button
          label={t('consent.accept')}
          disabled={!processing}
          loading={saveProfile.isPending}
          onPress={accept}
        />
      }
    >
      <Steps current={7} total={8} />
      <Title>{t('consent.title')}</Title>
      <Body>{t('consent.intro')}</Body>
      <Spacer size={space.sm} />

      <Check
        checked={processing}
        onToggle={() => setProcessing(!processing)}
        title={t('consent.processing')}
        body={t('consent.processingBody')}
      />
      <Check
        checked={transfer}
        onToggle={() => setTransfer(!transfer)}
        title={t('consent.transfer')}
        body={t('consent.transferBody')}
      />

      <Pressable onPress={() => router.push('/privacy')}>
        <Small style={s.link}>{t('consent.readPolicy')}</Small>
      </Pressable>
    </Screen>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  box: {
    width: 24, height: 24, borderRadius: radius.sm,
    borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  tick: { color: colors.bg, fontWeight: '900', fontSize: 14 },
  title: { ...type.body, fontWeight: '700', color: colors.text, flex: 1 },
  body: { lineHeight: 20 },
  link: { color: colors.lime, marginTop: space.sm, textDecorationLine: 'underline' },
})
