import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, Meter, Row, Screen, Small, Spacer, Title } from '../../components/ui'
import {
  useAdaptedDay, useCheckIn, useLogSession, usePlan, useSessionsThisWeek, useTodayDay,
} from '../../lib/data/queries'
import { useT } from '../../lib/i18n/useT'
import { colors, space, type } from '../../lib/theme'

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

  const [index, setIndex] = useState(0)
  const [setsDone, setSetsDone] = useState(0)

  if (!plan || !day) {
    return (
      <Screen>
        <Title>{t('today.noPlan')}</Title>
      </Screen>
    )
  }

  const totalSets = day.exercises.reduce((n, x) => n + x.sets, 0)
  const exercise = day.exercises[index]

  const finish = () => {
    logSession.mutate({ planId: plan.id, dayId: dayId ?? day.id, setsDone })
    router.replace('/(tabs)/today')
  }

  if (!exercise) {
    return (
      <Screen footer={<Button label={t('common.done')} onPress={finish} />}>
        <Spacer size={space.xxl} />
        <Title>{t('workout.finished')}</Title>
        <Body>
          {setsDone} / {totalSets} {t('common.set')}
        </Body>
      </Screen>
    )
  }

  const setsBefore = day.exercises.slice(0, index).reduce((n, x) => n + x.sets, 0)
  const doneInExercise = Math.max(0, setsDone - setsBefore)

  const logSet = () => {
    setSetsDone(setsDone + 1)
    if (doneInExercise + 1 >= exercise.sets) setIndex(index + 1)
  }

  return (
    <Screen
      footer={
        <>
          <Button label={t('workout.logSet')} onPress={logSet} />
          <Button label={t('workout.finish')} variant="ghost" onPress={finish} />
        </>
      }
    >
      <Meter value={setsDone} max={totalSets} />
      <Small>
        {setsDone} / {totalSets} {t('common.set')}
      </Small>

      <Spacer size={space.lg} />
      <Card tone="accent">
        <Small style={s.eyebrow}>{day.title[locale]}</Small>
        <Text style={s.name}>{exercise.name[locale]}</Text>
        <Row style={s.numbers}>
          <View style={s.number}>
            <Text style={s.numberValue}>{exercise.reps}</Text>
            <Small>{t('common.rep')}</Small>
          </View>
          <View style={s.number}>
            <Text style={s.numberValue}>{exercise.restSec}</Text>
            <Small>{t('common.rest')}</Small>
          </View>
          <View style={s.number}>
            <Text style={s.numberValue}>{exercise.rpe}/10</Text>
            <Small>RPE</Small>
          </View>
        </Row>
        <Small>{t('workout.setOf', { current: doneInExercise + 1, total: exercise.sets })}</Small>
      </Card>

      {day.exercises[index + 1] ? (
        <Card>
          <Small>{t('common.next')}</Small>
          <Text style={s.upNext}>{day.exercises[index + 1]!.name[locale]}</Text>
        </Card>
      ) : null}
    </Screen>
  )
}

const s = StyleSheet.create({
  eyebrow: { color: colors.limeDim, letterSpacing: 1 },
  name: { ...type.display, color: colors.text },
  numbers: { gap: space.xl, marginTop: space.sm },
  number: { gap: 2 },
  numberValue: { ...type.title, color: colors.lime },
  upNext: { ...type.body, fontWeight: '700', color: colors.text },
})
