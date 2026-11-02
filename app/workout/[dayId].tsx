import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Body, Button, Caption, Card, Display, Heading, Meter, Row, Screen, Stat, Title,
} from '../../components/ui'
import {
  useAdaptedDay, useCheckIn, useLogSession, usePlan, useSessionsThisWeek, useTodayDay,
} from '../../lib/data/queries'
import { space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { positionOf } from '../../lib/plan/session'

/**
 * One set at a time. The whole session on a single scrollable page is a
 * spreadsheet; a person mid-set needs the next number and nothing else.
 */
export default function Workout() {
  const { t, locale } = useT()
  const { dayId } = useLocalSearchParams<{ dayId: string }>()
  const { data: plan } = usePlan()
  const { data: checkIn } = useCheckIn()
  const { data: sessions } = useSessionsThisWeek()
  const logSession = useLogSession()

  const planned = useTodayDay(plan, sessions?.length ?? 0)
  const adaptation = useAdaptedDay(planned, checkIn)
  const day = adaptation?.day ?? planned

  const [setsDone, setSetsDone] = useState(0)

  if (!plan || !day) {
    return (
      <Screen center>
        <Title>{t('today.noPlan')}</Title>
      </Screen>
    )
  }

  const totalSets = day.exercises.reduce((n, x) => n + x.sets, 0)
  const { index, doneInExercise } = positionOf(day, setsDone)
  const exercise = day.exercises[index]
  const progress = t('workout.setsDone', { done: setsDone, total: totalSets })

  const finish = () => {
    logSession.mutate({ planId: plan.id, dayId: dayId ?? day.id, setsDone })
    router.replace('/(tabs)/today')
  }

  // Taking back a mis-tap. Without it, one stray press skipped a set for good.
  const undo =
    setsDone > 0 ? (
      <Button
        label={t('workout.undo')}
        hint={t('workout.undoHint')}
        icon="undo"
        variant="quiet"
        style={{ flex: 1 }}
        onPress={() => setSetsDone(setsDone - 1)}
      />
    ) : null

  if (!exercise) {
    return (
      <Screen
        center
        footer={
          <>
            <Button label={t('common.done')} onPress={finish} />
            {undo}
          </>
        }
      >
        <Title>{t('workout.finished')}</Title>
        <Body muted>{progress}</Body>
      </Screen>
    )
  }

  const next = day.exercises[index + 1]

  return (
    <Screen
      footer={
        <>
          <Button label={t('workout.logSet')} onPress={() => setSetsDone(setsDone + 1)} />
          <Row>
            {undo}
            <Button label={t('workout.finish')} variant="quiet" style={{ flex: 1 }} onPress={finish} />
          </Row>
        </>
      }
    >
      <View style={{ gap: space.xs }}>
        <Caption strong>{progress}</Caption>
        <Meter value={setsDone} max={totalSets} label={progress} />
      </View>

      <Card>
        <Caption strong>{day.title[locale]}</Caption>
        <Display>{exercise.name[locale]}</Display>
        <Caption strong>{t('workout.setOf', { current: doneInExercise + 1, total: exercise.sets })}</Caption>
        <Row style={{ gap: space.xl, marginTop: space.sm, alignItems: 'flex-start' }}>
          <Stat label={t('common.rep')} value={exercise.reps} />
          <Stat label={t('common.rest')} value={exercise.restSec} unit={t('common.second')} />
          <Stat label={t('workout.rpeLabel')} value={exercise.rpe} />
        </Row>
      </Card>

      {next ? (
        <Card tone="raised">
          <Caption>{t('common.next')}</Caption>
          <Heading>{next.name[locale]}</Heading>
        </Card>
      ) : null}
    </Screen>
  )
}
