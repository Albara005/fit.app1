import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Icon } from '../../components/Icon'
import {
  Body, Button, Caption, Card, CoachLine, Divider, Heading, Meter, Row, Scale, Screen, Section,
  Stepper, Title,
} from '../../components/ui'
import {
  useAdaptedDay, useCheckIn, usePlan, useSaveCheckIn, useSessionsThisWeek, useTodayDay,
} from '../../lib/data/queries'
import { today } from '../../lib/data/repo'
import { makeStyles, useTheme } from '../../lib/design/theme'
import { space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { exerciseById } from '../../lib/plan/exercises'
import type { CheckIn } from '../../lib/types'

/**
 * Loop one. Ten seconds in — every answer pre-filled with an ordinary day, so
 * an ordinary day is one tap — and one adjusted session out, with the single
 * sentence that says why it changed.
 */
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
          onPress={() => onDone({ date: today(), sleepHours, energy, soreness, stress, minutesAvailable })}
        />
      }
    >
      <Title>{t('today.checkInTitle')}</Title>
      <Body muted>{t('today.checkInBody')}</Body>

      <Section title={t('today.sleep')}>
        <Stepper label={t('today.sleep')} value={sleepHours} onChange={setSleep} min={0} max={14} step={0.5} unit={t('common.hour')} />
      </Section>
      <Section title={t('today.energy')}>
        <Scale
          label={t('today.energy')}
          value={energy}
          onChange={(v) => setEnergy(v as CheckIn['energy'])}
          low={t('today.energyLow')}
          high={t('today.energyHigh')}
        />
      </Section>
      <Section title={t('today.soreness')}>
        <Scale
          label={t('today.soreness')}
          value={soreness}
          onChange={(v) => setSoreness(v as CheckIn['soreness'])}
          low={t('today.sorenessLow')}
          high={t('today.sorenessHigh')}
        />
      </Section>
      <Section title={t('today.stress')}>
        <Scale
          label={t('today.stress')}
          value={stress}
          onChange={(v) => setStress(v as CheckIn['stress'])}
          low={t('today.stressLow')}
          high={t('today.stressHigh')}
        />
      </Section>
      <Section title={t('today.time')}>
        <Stepper label={t('today.time')} value={minutesAvailable} onChange={setMinutes} min={10} max={180} step={5} unit={t('common.minute')} />
      </Section>
    </Screen>
  )
}

/** The week's count against the user's own target — the number this product is judged on. */
function WeekProgress({ done, target }: { done: number; target: number }) {
  const { t } = useT()
  const label = t('today.weekProgress', { done, target })
  return (
    <View style={{ gap: space.xs }}>
      <Caption strong>{label}</Caption>
      <Meter value={done} max={target} label={label} />
    </View>
  )
}

export default function Today() {
  const { t, locale } = useT()
  const { p } = useTheme()
  const s = useStyles()
  const { data: plan } = usePlan()
  const { data: checkIn } = useCheckIn()
  const { data: sessions } = useSessionsThisWeek()
  const saveCheckIn = useSaveCheckIn()

  const completed = sessions?.length ?? 0
  const day = useTodayDay(plan, completed)
  const adaptation = useAdaptedDay(day, checkIn)

  if (!plan) {
    return (
      <Screen center footer={<Button label={t('today.noPlanCta')} onPress={() => router.push('/(onboarding)/generating')} />}>
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
        <WeekProgress done={completed} target={plan.days.length} />
        <Title>{t('today.restDay')}</Title>
        <CoachLine>{t('today.restBody')}</CoachLine>
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
      <WeekProgress done={completed} target={plan.days.length} />

      {/* The sentence is the product. The adjusted session on its own reads as
          the app being arbitrary. */}
      <CoachLine label={t('today.whyChanged')}>{adaptation.line[locale]}</CoachLine>

      <Section
        title={session.title[locale]}
        action={
          <Row style={s.minutes}>
            <Icon name="clock" color={p.textMuted} size={18} />
            <Caption>{t('today.estMinutes', { minutes: session.estMinutes })}</Caption>
          </Row>
        }
      >
        <Card>
          {session.exercises.map((exercise, i) => {
            // Resolved to a name: the record carries an id, and an id is not
            // something to show anyone — let alone in the one sentence that
            // explains a change made for their safety.
            const swappedFrom = exercise.substitutedFor
              ? (exerciseById(exercise.substitutedFor.id)?.name[locale] ?? null)
              : null
            return (
              <View key={exercise.id}>
                {i > 0 ? <Divider /> : null}
                <View style={s.exercise}>
                  <Heading>{exercise.name[locale]}</Heading>
                  <Caption>
                    {exercise.sets} × {exercise.reps} · {t('common.rest')} {exercise.restSec} {t('common.second')} ·{' '}
                    {t('workout.rpe', { value: exercise.rpe })}
                  </Caption>
                  {exercise.substitutedFor ? (
                    <Row style={s.swap}>
                      <Icon name="swap" color={p.warn} size={18} />
                      <Caption style={s.swapText}>
                        {/* If the original cannot be named, the generic line still
                            says a swap happened and why — a safety note is never
                            dropped for want of a name. */}
                        {swappedFrom
                          ? t('today.swapped', {
                              from: swappedFrom,
                              to: exercise.name[locale],
                              reason: t('safety.reasonInjury', {
                                injury: t(`injury.${exercise.substitutedFor.injury}`),
                              }),
                            })
                          : t('safety.substituted', { injury: t(`injury.${exercise.substitutedFor.injury}`) })}
                      </Caption>
                    </Row>
                  ) : null}
                </View>
              </View>
            )
          })}
        </Card>
      </Section>
    </Screen>
  )
}

const useStyles = makeStyles((p) => ({
  minutes: { gap: space.xs },
  exercise: { gap: 2, paddingVertical: space.xs },
  swap: { alignItems: 'flex-start', marginTop: space.xs },
  swapText: { color: p.warn, flex: 1 },
}))
