import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  Body, Button, Card, CoachNote, Divider, Row, Scale, Screen, SectionTitle,
  Small, Spacer, Stat, Stepper, Title,
} from '../../components/ui'
import {
  useAdaptedDay, useCheckIn, usePlan, useSaveCheckIn, useSessionsThisWeek, useTodayDay,
} from '../../lib/data/queries'
import { today } from '../../lib/data/repo'
import { useT } from '../../lib/i18n/useT'
import { colors, radius, space, type } from '../../lib/theme'
import type { CheckIn } from '../../lib/types'

function CheckInForm({ onDone }: { onDone: (checkIn: CheckIn) => void }) {
  const { t } = useT()
  const [sleepHours, setSleep] = useState(7)
  const [energy, setEnergy] = useState<CheckIn['energy']>(3)
  const [soreness, setSoreness] = useState<CheckIn['soreness']>(2)
  const [stress, setStress] = useState<CheckIn['stress']>(2)
  const [minutesAvailable, setMinutes] = useState(60)

  return (
    <Screen
      footer={
        <Button
          label={t('today.submit')}
          onPress={() =>
            onDone({ date: today(), sleepHours, energy, soreness, stress, minutesAvailable })
          }
        />
      }
    >
      <Title>{t('today.checkInTitle')}</Title>
      <Body>{t('today.checkInBody')}</Body>
      <Spacer size={space.sm} />

      <SectionTitle>{t('today.sleep')}</SectionTitle>
      <Stepper
        value={sleepHours}
        onChange={setSleep}
        min={0}
        max={14}
        step={0.5}
        suffix={t('common.hour')}
      />

      <SectionTitle>{t('today.energy')}</SectionTitle>
      <Scale
        value={energy}
        onChange={(v) => setEnergy(v as CheckIn['energy'])}
        lowLabel={t('today.energyLow')}
        highLabel={t('today.energyHigh')}
      />

      <SectionTitle>{t('today.soreness')}</SectionTitle>
      <Scale
        value={soreness}
        onChange={(v) => setSoreness(v as CheckIn['soreness'])}
        lowLabel={t('today.sorenessLow')}
        highLabel={t('today.sorenessHigh')}
      />

      <SectionTitle>{t('today.stress')}</SectionTitle>
      <Scale
        value={stress}
        onChange={(v) => setStress(v as CheckIn['stress'])}
        lowLabel={t('today.stressLow')}
        highLabel={t('today.stressHigh')}
      />

      <SectionTitle>{t('today.time')}</SectionTitle>
      <Stepper
        value={minutesAvailable}
        onChange={setMinutes}
        min={10}
        max={180}
        step={5}
        suffix={t('common.minute')}
      />
    </Screen>
  )
}

export default function Today() {
  const { t, locale } = useT()
  const { data: plan } = usePlan()
  const { data: checkIn } = useCheckIn()
  const { data: sessions } = useSessionsThisWeek()
  const saveCheckIn = useSaveCheckIn()

  const completed = sessions?.length ?? 0
  const day = useTodayDay(plan, completed)
  const adaptation = useAdaptedDay(day, checkIn)

  if (!plan) {
    return (
      <Screen footer={<Button label={t('today.noPlanCta')} onPress={() => router.push('/(onboarding)/generating')} />}>
        <Spacer size={space.xxl} />
        <Title>{t('today.noPlan')}</Title>
      </Screen>
    )
  }

  if (!checkIn) {
    return <CheckInForm onDone={(value) => saveCheckIn.mutate(value)} />
  }

  if (!adaptation || !day) {
    return (
      <Screen>
        <Title>{t('today.restDay')}</Title>
        <Body>{t('today.restBody')}</Body>
      </Screen>
    )
  }

  const session = adaptation.day

  return (
    <Screen
      footer={
        <Button
          label={t('today.startWorkout')}
          onPress={() => router.push(`/workout/${encodeURIComponent(session.id)}`)}
        />
      }
    >
      <Row style={s.northStar}>
        <Stat label={t('profile.northStar')} value={completed} />
        <View style={s.grow} />
        <Small>{t('today.estMinutes', { minutes: session.estMinutes })}</Small>
      </Row>

      {/* The sentence is the product. The adjusted session on its own reads as
          the app being arbitrary. */}
      <Card tone="accent">
        <Small style={s.whyLabel}>{t('today.whyChanged')}</Small>
        <CoachNote>{adaptation.line[locale]}</CoachNote>
      </Card>

      <SectionTitle>{session.title[locale]}</SectionTitle>
      <Card>
        {session.exercises.map((exercise, i) => (
          <View key={exercise.id}>
            {i > 0 ? <Divider /> : null}
            <View style={s.exercise}>
              <View style={s.grow}>
                <Text style={s.exerciseName}>{exercise.name[locale]}</Text>
                <Small>
                  {exercise.sets} × {exercise.reps} · {t('common.rest')} {exercise.restSec}{' '}
                  {t('common.second')} · {t('workout.rpe', { value: exercise.rpe })}
                </Small>
                {exercise.substitutedFor ? (
                  <Small style={s.swap}>
                    {t('today.swapped', {
                      from: exercise.substitutedFor.id,
                      to: exercise.name[locale],
                      reason: t('safety.reasonInjury', {
                        injury: t(`injury.${exercise.substitutedFor.injury}`),
                      }),
                    })}
                  </Small>
                ) : null}
              </View>
              <View style={s.badge}>
                <Text style={s.badgeText}>{exercise.sets}</Text>
              </View>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  northStar: { alignItems: 'flex-end' },
  grow: { flex: 1 },
  whyLabel: { color: colors.limeDim, textTransform: 'uppercase', letterSpacing: 1 },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  exerciseName: { ...type.body, fontWeight: '700', color: colors.text },
  swap: { color: colors.warn, marginTop: 2 },
  badge: {
    width: 34, height: 34, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { ...type.small, fontWeight: '700', color: colors.lime },
})
