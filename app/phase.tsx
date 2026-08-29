import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  Body, Button, Card, CoachNote, Divider, Row, Screen, SectionTitle, Small, Spacer, Title,
} from '../components/ui'
import { useDerivedProfile, useGeneratePlan, usePhaseReview, useSaveProfile } from '../lib/data/queries'
import { useT } from '../lib/i18n/useT'
import { reportValue, shareText } from '../lib/plan/phase'
import { shareOrCopy, type ShareOutcome } from '../lib/share'
import { colors, space, type } from '../lib/theme'

const GOAL_KEY: Record<string, string> = {
  cut: 'onboarding.goalCut',
  recomp: 'onboarding.goalRecomp',
  gain: 'onboarding.goalGain',
  strength: 'onboarding.goalStrength',
}

/**
 * Loop three, on one screen: what the phase did, and the single decision that
 * comes out of it. The report is plain text because the point is that it can
 * leave the app — to a coach, a doctor, or a group chat.
 */
export default function Phase() {
  const { t, locale } = useT()
  const profile = useDerivedProfile()
  const review = usePhaseReview(profile)
  const saveProfile = useSaveProfile()
  const generate = useGeneratePlan()
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null)

  const data = review.data

  if (!profile || !data) {
    return (
      <Screen>
        <Body>{t('common.loading')}</Body>
      </Screen>
    )
  }

  if (data.decision === 'TOO_EARLY') {
    return (
      <Screen footer={<Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />}>
        <Spacer size={space.xl} />
        <Card>
          <Title>{data.headline[locale]}</Title>
          <Body>{data.detail[locale]}</Body>
        </Card>
      </Screen>
    )
  }

  const suggested = data.suggestedGoal
  const text = shareText(data, locale)

  async function apply() {
    if (!profile) return
    const next = suggested ? { ...profile, goal: suggested } : profile
    if (suggested) await saveProfile.mutateAsync(next)
    // A new phase starts a new plan at week zero: carrying the old week index
    // forward would keep adding volume across a decision to change direction.
    await generate.mutateAsync({ profile: next, weekIndex: 0 })
    router.replace('/(tabs)/plan')
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label={
              suggested
                ? t('phase.changeGoal', { goal: t(GOAL_KEY[suggested] ?? 'plan.title') })
                : t('phase.continue')
            }
            loading={saveProfile.isPending || generate.isPending}
            onPress={apply}
          />
          <Button
            label={outcome === 'shared' ? t('phase.shared') : outcome === 'copied' ? t('phase.copied') : t('phase.share')}
            variant="secondary"
            onPress={async () => setOutcome(await shareOrCopy(t('phase.title'), text))}
          />
        </>
      }
    >
      <Body>{t('phase.intro')}</Body>

      <Card tone="accent">
        <Title>{data.headline[locale]}</Title>
        <CoachNote>{data.detail[locale]}</CoachNote>
      </Card>

      <SectionTitle>{t('phase.report')}</SectionTitle>
      <Card>
        {data.report.map((line, i) => (
          <View key={line.key}>
            {i > 0 ? <Divider /> : null}
            <Row style={s.line}>
              <Body style={s.grow}>{line.label[locale]}</Body>
              <Text style={s.value}>{reportValue(line, locale)}</Text>
            </Row>
          </View>
        ))}
      </Card>

      {/* Neither a share sheet nor a clipboard: show the text so it can still
          be copied by hand rather than leaving a dead button. */}
      {outcome === 'unavailable' ? (
        <Card>
          <Small>{t('phase.copyManually')}</Small>
          <Text selectable style={s.raw}>
            {text}
          </Text>
        </Card>
      ) : null}
      <Spacer size={space.md} />
    </Screen>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  line: { paddingVertical: space.xs },
  value: { ...type.body, fontWeight: '700', color: colors.lime },
  raw: { ...type.small, color: colors.textMute, lineHeight: 20 },
})
