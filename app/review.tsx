import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { TrendChart } from '../components/TrendChart'
import {
  Body, Button, Caption, Card, CoachLine, Grow, Heading, Meter, Row, Screen, Section, Stat, Stepper, Title,
} from '../components/ui'
import {
  useAddWeight, useDerivedProfile, useGeneratePlan, useSaveProfile, useWeeklyReview,
} from '../lib/data/queries'
import { today } from '../lib/data/repo'
import { space } from '../lib/design/tokens'
import { ltr } from '../lib/i18n'
import { useT } from '../lib/i18n/useT'

/**
 * Loop two, in two minutes: one number in, then what happened, what changed,
 * and what is new. The cards come out of the review itself, so the app cannot
 * describe a change it did not make.
 */
export default function Review() {
  const { t, locale } = useT()
  const profile = useDerivedProfile()
  const addWeight = useAddWeight()
  const saveProfile = useSaveProfile()
  const generate = useGeneratePlan()
  const [logged, setLogged] = useState(false)
  // Not computed until the weight entered on the first step is saved. Computed
  // on mount, the review ran without it and never ran again: it reported a
  // trend from every reading except the one this loop asks for.
  const review = useWeeklyReview(logged ? profile : null)
  // Untouched means "as saved". Seeded once at mount, the stepper kept 80 kg on
  // a cold load — before the profile arrived — and Next logged it as today's.
  const [weightChoice, setWeight] = useState<number | null>(null)
  const weight = weightChoice ?? profile?.weightKg ?? 80

  if (!profile) {
    return (
      <Screen center>
        <Title>{t('today.noPlan')}</Title>
      </Screen>
    )
  }

  if (!logged) {
    return (
      <Screen
        footer={
          <Button
            label={t('common.next')}
            loading={addWeight.isPending}
            onPress={async () => {
              await addWeight.mutateAsync({ day: today(), weightKg: weight })
              setLogged(true)
            }}
          />
        }
      >
        <Title>{t('review.weightPrompt')}</Title>
        <Body muted>{t('review.intro')}</Body>
        <Stepper label={t('review.weightPrompt')} value={weight} onChange={setWeight} min={35} max={250} step={0.1} unit={t('common.kg')} />
      </Screen>
    )
  }

  const data = review.data

  return (
    <Screen
      footer={
        <Button
          label={t('review.apply')}
          // isFetching, not isPending: a review being recomputed is not the one
          // to apply.
          loading={generate.isPending || review.isFetching}
          disabled={!data || review.isFetching}
          onPress={async () => {
            if (!data) return
            await saveProfile.mutateAsync(data.nextProfile)
            await generate.mutateAsync({ profile: data.nextProfile, weekIndex: data.nextPlan.weekIndex })
            router.replace('/(tabs)/plan')
          }}
        />
      }
    >
      {data ? (
        <>
          <Card>
            <Row style={{ alignItems: 'flex-start' }}>
              <Stat label={t('review.adherence')} value={`${Math.round(data.adherence * 100)}%`} />
              <Grow />
              {data.weeklyChangeKg !== null ? (
                <Stat
                  size="small"
                  label={t('review.change')}
                  // Isolated: a leading minus is directionally weak, and in Arabic
                  // it would otherwise land after the number.
                  value={ltr(`${data.weeklyChangeKg > 0 ? '+' : ''}${Math.round(data.weeklyChangeKg * 100) / 100}`)}
                  unit={t('common.kg')}
                />
              ) : null}
            </Row>
            <Meter value={data.adherence} max={1} label={t('review.adherence')} />
          </Card>

          {/* The review's own line over the review's own readings: never refitted here. */}
          {data.line ? (
            <Card>
              <TrendChart readings={data.readings} line={data.line} />
            </Card>
          ) : null}

          {/* What happened, what changed, what is new — in that order, one each. */}
          {data.cards.map((card) =>
            card.key === 'changed' ? (
              <CoachLine key={card.key} label={card.title[locale]}>
                {card.body[locale]}
              </CoachLine>
            ) : (
              <Card key={card.key}>
                <Heading>{card.title[locale]}</Heading>
                <Body>{card.body[locale]}</Body>
              </Card>
            ),
          )}

          <Section title={t('plan.week', { index: data.nextPlan.weekIndex + 1 })}>
            <Card>
              <Row style={{ gap: space.lg, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Stat size="small" label={t('common.kcal')} value={data.nextPlan.nutrition.kcal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Stat size="small" label={t('plan.protein')} value={data.nextPlan.nutrition.protein} unit={t('common.gram')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Stat size="small" label={t('onboarding.daysUnit')} value={data.nextProfile.daysPerWeek} />
                </View>
              </Row>
            </Card>
          </Section>
        </>
      ) : (
        <Caption>{t('common.loading')}</Caption>
      )}
    </Screen>
  )
}
