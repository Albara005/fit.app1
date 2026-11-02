import { router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import {
  Body, Button, Caption, Card, CoachLine, Divider, Row, Screen, Section, Title,
} from '../components/ui'
import { useDerivedProfile, useGeneratePlan, usePhaseReview, useSaveProfile } from '../lib/data/queries'
import { makeStyles } from '../lib/design/theme'
import { space } from '../lib/design/tokens'
import { type } from '../lib/design/typography'
import { useT } from '../lib/i18n/useT'
import { reportValue, shareText } from '../lib/plan/phase'
import { shareOrCopy, type ShareOutcome } from '../lib/share'

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
  const s = useStyles()
  const profile = useDerivedProfile()
  const review = usePhaseReview(profile)
  const saveProfile = useSaveProfile()
  const generate = useGeneratePlan()
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null)

  const data = review.data

  if (!profile || !data) {
    return (
      <Screen center>
        <Caption>{t('common.loading')}</Caption>
      </Screen>
    )
  }

  if (data.decision === 'TOO_EARLY') {
    return (
      <Screen center footer={<Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />}>
        <Title>{data.headline[locale]}</Title>
        <Body muted>{data.detail[locale]}</Body>
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
            icon="share"
            variant="secondary"
            onPress={async () => setOutcome(await shareOrCopy(t('phase.title'), text))}
          />
        </>
      }
    >
      <Body muted>{t('phase.intro')}</Body>
      <Title>{data.headline[locale]}</Title>
      <CoachLine>{data.detail[locale]}</CoachLine>

      <Section title={t('phase.report')}>
        <Card>
          {data.report.map((line, i) => (
            <View key={line.key}>
              {i > 0 ? <Divider /> : null}
              <Row style={{ paddingVertical: space.xs }}>
                <Body muted style={{ flex: 1 }}>
                  {line.label[locale]}
                </Body>
                <Text style={s.value}>{reportValue(line, locale)}</Text>
              </Row>
            </View>
          ))}
        </Card>
      </Section>

      {/* Neither a share sheet nor a clipboard: show the text so it can still
          be copied by hand rather than leaving a dead button. */}
      {outcome === 'unavailable' ? (
        <Card tone="raised">
          <Caption>{t('phase.copyManually')}</Caption>
          <Body selectable>{text}</Body>
        </Card>
      ) : null}
    </Screen>
  )
}

const useStyles = makeStyles((p) => ({
  value: { ...type.numeralSmall, color: p.text },
}))
