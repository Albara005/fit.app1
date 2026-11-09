import { router } from 'expo-router'
import { useState } from 'react'
import { Modal, View } from 'react-native'
import { MealSheet } from '../../components/MealSheet'
import {
  Body, Button, Caption, Card, Divider, Field, Grow, Meter, Row, Screen, Stat,
} from '../../components/ui'
import { useAddCorrection, useMeals, usePlan, useUpdateMeal } from '../../lib/data/queries'
import { space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { formatRange, midpoint } from '../../lib/nutrition/estimate'
import { dishKey } from '../../lib/nutrition/memory'
import type { MealLogEntry } from '../../lib/types'

function Correction({ entry, onDone }: { entry: MealLogEntry; onDone: () => void }) {
  const { t } = useT()
  const [value, setValue] = useState('')
  const addCorrection = useAddCorrection()
  const updateMeal = useUpdateMeal()

  const save = () => {
    const kcal = Number(value)
    if (!Number.isFinite(kcal) || kcal <= 0) return
    // Stored as truth, not blended into the estimate: the user's own number is
    // what the next estimate for this dish is built from.
    addCorrection.mutate({
      dishKey: dishKey(entry.label),
      kcal,
      portion: entry.portion,
      cookMethod: entry.cookMethod,
      city: null,
      correctedAt: new Date().toISOString(),
    })
    updateMeal.mutate({ id: entry.id, patch: { correctedKcal: kcal, status: 'corrected' } })
    onDone()
  }

  return (
    <View style={{ gap: space.sm, paddingBottom: space.sm }}>
      <Field
        label={t('meals.correctLabel')}
        hint={t('meals.correctBody')}
        value={value}
        onChangeText={setValue}
        inputMode="numeric"
        placeholder={String(midpoint(entry.estimate.kcal))}
        returnKeyType="done"
        onSubmitEditing={save}
        autoFocus
      />
      <Button label={t('common.save')} variant="secondary" onPress={save} />
    </View>
  )
}

export default function Meals() {
  const { t } = useT()
  const { data: plan } = usePlan()
  const { data: meals } = useMeals()
  const [adding, setAdding] = useState(false)
  const [correcting, setCorrecting] = useState<string | null>(null)

  const entries = meals ?? []
  const target = plan?.nutrition.kcal ?? 2000
  const low = entries.reduce((n, m) => n + (m.correctedKcal ?? m.estimate.kcal.min), 0)
  const high = entries.reduce((n, m) => n + (m.correctedKcal ?? m.estimate.kcal.max), 0)
  const mid = Math.round((low + high) / 2)
  const remaining = target - mid

  return (
    <>
      <Screen
        footer={
          <>
            <Button label={t('meals.addMeal')} icon="plus" onPress={() => setAdding(true)} />
            <Row>
              <Button
                label={t('meals.barcode')}
                icon="barcode"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push('/meal/label')}
              />
              <Button
                label={t('meals.photo')}
                icon="camera"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push('/meal/photo')}
              />
            </Row>
          </>
        }
      >
        <Card>
          <Row style={{ alignItems: 'flex-start' }}>
            {/* A range, not a number: a photo cannot see the oil. */}
            <Stat label={t('meals.todayTotal')} value={formatRange({ min: low, max: high })} unit={t('common.kcal')} />
            <Grow />
            <Stat
              size="small"
              label={remaining >= 0 ? t('meals.remaining') : t('meals.over')}
              value={Math.abs(remaining)}
              unit={t('common.kcal')}
            />
          </Row>
          <Meter value={mid} max={target} tone={remaining < 0 ? 'warn' : 'primary'} label={t('meals.progressLabel')} />
        </Card>

        {/* No heading here: the header above already names the screen. */}
        {entries.length === 0 ? (
            <Card>
              <Body muted>{t('meals.empty')}</Body>
            </Card>
          ) : (
            <Card>
              {entries.map((entry, i) => (
                <View key={entry.id}>
                  {i > 0 ? <Divider /> : null}
                  <Row style={{ paddingVertical: space.xs }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Body strong>{entry.label}</Body>
                      <Caption>
                        {entry.correctedKcal
                          ? `${entry.correctedKcal} ${t('common.kcal')}`
                          : formatRange(entry.estimate.kcal, t('common.kcal'))}
                        {entry.status === 'estimating' ? ` · ${t('meals.analyzing')}` : ''}
                      </Caption>
                    </View>
                    <Button
                      label={t('meals.correct')}
                      variant="quiet"
                      onPress={() => setCorrecting(correcting === entry.id ? null : entry.id)}
                    />
                  </Row>
                  {correcting === entry.id ? <Correction entry={entry} onDone={() => setCorrecting(null)} /> : null}
                </View>
              ))}
            </Card>
          )}
      </Screen>

      <Modal visible={adding} animationType="slide" onRequestClose={() => setAdding(false)}>
        <MealSheet onClose={() => setAdding(false)} />
      </Modal>
    </>
  )
}
