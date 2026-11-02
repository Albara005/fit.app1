import { router } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import {
  Badge, Body, Button, Caption, Card, CoachLine, Divider, Grow, Heading, Row, Screen, Section, Stat, Title,
} from '../../components/ui'
import { usePlan } from '../../lib/data/queries'
import { space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { MIN_PHASE_WEEKS } from '../../lib/plan/phase'
import { useSettings } from '../../lib/store/settings'

/** The week as built, and the door into loop two. */
export default function PlanTab() {
  const { t, locale } = useT()
  const { data: plan } = usePlan()
  const markPlanSeen = useSettings((state) => state.markPlanSeen)

  useEffect(() => {
    if (plan) markPlanSeen(plan.weekIndex)
  }, [plan, markPlanSeen])

  if (!plan) {
    return (
      <Screen center>
        <Title>{t('today.noPlan')}</Title>
      </Screen>
    )
  }

  const { nutrition } = plan
  const week = plan.weekIndex + 1

  return (
    <Screen
      footer={
        <>
          <Button label={t('review.start')} onPress={() => router.push('/review')} />
          {/* Shown from the sixth week, which is when it has something to say.
              The screen still refuses to decide early if it is opened sooner. */}
          {week >= MIN_PHASE_WEEKS ? (
            <Button label={t('phase.open')} variant="secondary" onPress={() => router.push('/phase')} />
          ) : (
            <Caption style={{ alignSelf: 'center' }}>{t('phase.weeksIn', { weeks: week })}</Caption>
          )}
        </>
      }
    >
      <Row>
        <Title>{t('plan.week', { index: week })}</Title>
        <Grow />
        <Badge label={t(`plan.source.${plan.source}`)} tone={plan.source === 'model' ? 'accent' : 'default'} />
      </Row>

      <CoachLine>{plan.rationale[locale]}</CoachLine>
      {plan.source === 'template' ? <Caption>{t('plan.sourceTemplateBody')}</Caption> : null}

      <Section title={t('plan.nutrition')}>
        <Card>
          <Stat label={t('common.kcal')} value={nutrition.kcal} />
          <Divider />
          <Row style={{ gap: space.lg }}>
            <View style={{ flex: 1 }}>
              <Stat size="small" label={t('plan.protein')} value={nutrition.protein} unit={t('common.gram')} />
            </View>
            <View style={{ flex: 1 }}>
              <Stat size="small" label={t('plan.carbs')} value={nutrition.carbs} unit={t('common.gram')} />
            </View>
            <View style={{ flex: 1 }}>
              <Stat size="small" label={t('plan.fat')} value={nutrition.fat} unit={t('common.gram')} />
            </View>
          </Row>
        </Card>
      </Section>

      <Section title={t('plan.training')}>
        {plan.days.map((day) => (
          <Card key={day.id}>
            <Row>
              <Heading style={{ flex: 1 }}>{day.title[locale]}</Heading>
              <Caption>{t('today.estMinutes', { minutes: day.estMinutes })}</Caption>
            </Row>
            <Divider />
            {day.exercises.map((exercise) => (
              <Row key={exercise.id}>
                <Body style={{ flex: 1 }}>{exercise.name[locale]}</Body>
                <Caption>
                  {exercise.sets} × {exercise.reps}
                </Caption>
              </Row>
            ))}
          </Card>
        ))}
      </Section>

      <Section title={t('meals.title')}>
        {plan.meals.map((meal) => (
          <Card key={meal.id}>
            <Heading>{meal.title[locale]}</Heading>
            <Divider />
            {meal.items.map((item, i) => (
              <Row key={`${meal.id}-${i}`}>
                <Body style={{ flex: 1 }}>{item.name[locale]}</Body>
                <Caption>
                  {item.grams} {t('common.gram')} · {item.kcal} {t('common.kcal')}
                </Caption>
              </Row>
            ))}
          </Card>
        ))}
      </Section>
    </Screen>
  )
}
