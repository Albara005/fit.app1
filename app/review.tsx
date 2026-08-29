import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  Body, Button, Card, Meter, Row, Screen, SectionTitle, Small, Spacer, Stat, Stepper, Title,
} from '../components/ui'
import {
  useAddWeight, useDerivedProfile, useGeneratePlan, useSaveProfile, useWeeklyReview,
} from '../lib/data/queries'
import { today } from '../lib/data/repo'
import { useT } from '../lib/i18n/useT'
import { colors, space, type } from '../lib/theme'

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
  const review = useWeeklyReview(profile)
  const [weight, setWeight] = useState(profile?.weightKg ?? 80)
  const [logged, setLogged] = useState(false)

  if (!profile) {
    return (
      <Screen>
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
            onPress={() => {
              addWeight.mutate({ day: today(), weightKg: weight })
              setLogged(true)
            }}
          />
        }
      >
        <Body>{t('review.intro')}</Body>
        <Spacer size={space.lg} />
        <SectionTitle>{t('review.weightPrompt')}</SectionTitle>
        <Stepper value={weight} onChange={setWeight} min={35} max={250} step={0.1} suffix={t('common.kg')} />
      </Screen>
    )
  }

  const data = review.data

  return (
    <Screen
      footer={
        <Button
          label={t('review.apply')}
          loading={generate.isPending || review.isPending}
          disabled={!data}
          onPress={async () => {
            if (!data) return
            await saveProfile.mutateAsync(data.nextProfile)
            await generate.mutateAsync({
              profile: data.nextProfile,
              weekIndex: data.nextPlan.weekIndex,
            })
            router.replace('/(tabs)/plan')
          }}
        />
      }
    >
      {data ? (
        <>
          <Card>
            <Row>
              <Stat label={t('review.adherence')} value={`${Math.round(data.adherence * 100)}%`} />
              <View style={s.grow} />
              {data.weeklyChangeKg !== null ? (
                <Stat
                  label={t('common.week')}
                  value={`${data.weeklyChangeKg > 0 ? '+' : ''}${Math.round(data.weeklyChangeKg * 100) / 100}`}
                  unit={t('common.kg')}
                />
              ) : null}
            </Row>
            <Spacer size={space.sm} />
            <Meter value={data.adherence} max={1} />
          </Card>

          {data.cards.map((card) => (
            <Card key={card.key}>
              <Text style={s.cardTitle}>{card.title[locale]}</Text>
              <Body muted={false}>{card.body[locale]}</Body>
            </Card>
          ))}

          <Card tone="accent">
            <Small>{t('plan.week', { index: data.nextPlan.weekIndex + 1 })}</Small>
            <Row>
              <Stat label={t('common.kcal')} value={data.nextPlan.nutrition.kcal} />
              <View style={s.grow} />
              <Stat
                  label={t('plan.protein')}
                  value={data.nextPlan.nutrition.protein}
                  unit={t('common.gram')}
                />
              <View style={s.grow} />
              <Stat label={t('onboarding.daysUnit')} value={data.nextProfile.daysPerWeek} />
            </Row>
          </Card>
        </>
      ) : (
        <Body>{t('common.loading')}</Body>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  cardTitle: { ...type.heading, color: colors.lime },
})
