import { router } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  Body, Button, Card, CoachNote, Divider, Row, Screen, SectionTitle, Small, Spacer, Stat, Title,
} from '../../components/ui'
import { usePlan } from '../../lib/data/queries'
import { MIN_PHASE_WEEKS } from '../../lib/plan/phase'
import { useSettings } from '../../lib/store/settings'
import { useT } from '../../lib/i18n/useT'
import { colors, radius, space, type } from '../../lib/theme'

export default function PlanTab() {
  const { t, locale } = useT()
  const { data: plan } = usePlan()
  const markPlanSeen = useSettings((state) => state.markPlanSeen)

  useEffect(() => {
    if (plan) markPlanSeen(plan.weekIndex)
  }, [plan, markPlanSeen])

  if (!plan) {
    return (
      <Screen>
        <Title>{t('today.noPlan')}</Title>
      </Screen>
    )
  }

  const { nutrition } = plan

  return (
    <Screen
      footer={
        <>
          <Button label={t('review.start')} onPress={() => router.push('/review')} />
          {/* Shown from the sixth week, which is when it has something to say.
              The screen still refuses to decide early if it is opened sooner. */}
          {plan.weekIndex + 1 >= MIN_PHASE_WEEKS ? (
            <Button label={t('phase.open')} variant="secondary" onPress={() => router.push('/phase')} />
          ) : (
            <Small style={s.hint}>{t('phase.weeksIn', { weeks: plan.weekIndex + 1 })}</Small>
          )}
        </>
      }
    >
      <Row>
        <Title style={s.grow}>{t('plan.week', { index: plan.weekIndex + 1 })}</Title>
        <View style={s.source}>
          <Small style={s.sourceText}>{t(`plan.source.${plan.source}`)}</Small>
        </View>
      </Row>

      <CoachNote>{plan.rationale[locale]}</CoachNote>
      {plan.source === 'template' ? <Small>{t('plan.sourceTemplateBody')}</Small> : null}

      <SectionTitle>{t('plan.nutrition')}</SectionTitle>
      <Card>
        <Row>
          <Stat label={t('common.kcal')} value={nutrition.kcal} />
          <View style={s.grow} />
          <Stat label={t('plan.protein')} value={nutrition.protein} unit={t('common.gram')} />
          <View style={s.grow} />
          <Stat label={t('plan.carbs')} value={nutrition.carbs} unit={t('common.gram')} />
          <View style={s.grow} />
          <Stat label={t('plan.fat')} value={nutrition.fat} unit={t('common.gram')} />
        </Row>
      </Card>

      <SectionTitle>{t('plan.training')}</SectionTitle>
      {plan.days.map((day) => (
        <Card key={day.id}>
          <Row>
            <Text style={[s.dayTitle, s.grow]}>{day.title[locale]}</Text>
            <Small>{t('today.estMinutes', { minutes: day.estMinutes })}</Small>
          </Row>
          <Divider />
          {day.exercises.map((exercise) => (
            <Row key={exercise.id} style={s.exercise}>
              <Body muted={false} style={s.grow}>
                {exercise.name[locale]}
              </Body>
              <Small>
                {exercise.sets} × {exercise.reps}
              </Small>
            </Row>
          ))}
        </Card>
      ))}

      <SectionTitle>{t('meals.title')}</SectionTitle>
      {plan.meals.map((meal) => (
        <Card key={meal.id}>
          <Text style={s.dayTitle}>{meal.title[locale]}</Text>
          <Divider />
          {meal.items.map((item, i) => (
            <Row key={`${meal.id}-${i}`} style={s.exercise}>
              <Body muted={false} style={s.grow}>
                {item.name[locale]}
              </Body>
              <Small>
                {item.grams} {t('common.gram')} · {item.kcal} {t('common.kcal')}
              </Small>
            </Row>
          ))}
        </Card>
      ))}
      <Spacer size={space.md} />
    </Screen>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  source: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  sourceText: { color: colors.sand },
  hint: { alignSelf: 'center' },
  dayTitle: { ...type.heading, color: colors.text },
  exercise: { paddingVertical: 3 },
})
