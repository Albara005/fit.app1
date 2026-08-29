import { router } from 'expo-router'
import { useState } from 'react'
import { Modal, StyleSheet, Text, View } from 'react-native'
import { MealSheet } from '../../components/MealSheet'
import {
  Body, Button, Card, Divider, Input, Meter, Row, Screen, SectionTitle, Small, Spacer, Stat, Title,
} from '../../components/ui'
import { useAddCorrection, useMeals, usePlan, useUpdateMeal } from '../../lib/data/queries'
import { useT } from '../../lib/i18n/useT'
import { formatRange, midpoint } from '../../lib/nutrition/estimate'
import { dishKey } from '../../lib/nutrition/memory'
import { colors, space, type } from '../../lib/theme'
import type { MealLogEntry } from '../../lib/types'

function Correction({ entry, onDone }: { entry: MealLogEntry; onDone: () => void }) {
  const { t } = useT()
  const [value, setValue] = useState('')
  const addCorrection = useAddCorrection()
  const updateMeal = useUpdateMeal()

  return (
    <View style={s.correction}>
      <Small>{t('meals.correctBody')}</Small>
      <Row>
        <Input
          value={value}
          onChangeText={setValue}
          inputMode="numeric"
          placeholder={String(midpoint(entry.estimate.kcal))}
          style={s.grow}
        />
        <Button
          label={t('common.save')}
          style={s.saveBtn}
          onPress={() => {
            const kcal = Number(value)
            if (!Number.isFinite(kcal) || kcal <= 0) return
            // Stored as truth, not blended into the estimate: the user's own
            // number is what the next estimate for this dish is built from.
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
          }}
        />
      </Row>
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
            <Button label={t('meals.addMeal')} onPress={() => setAdding(true)} />
            <Button
              label={t('meals.photo')}
              variant="secondary"
              onPress={() => router.push('/meal/photo')}
            />
          </>
        }
      >
        <Card>
          <Row>
            <Stat label={t('meals.todayTotal')} value={low === high ? low : `${low}–${high}`} unit={t('common.kcal')} />
            <View style={s.grow} />
            <Stat
              label={remaining >= 0 ? t('meals.remaining') : t('meals.over')}
              value={Math.abs(remaining)}
              unit={t('common.kcal')}
            />
          </Row>
          <Spacer size={space.sm} />
          <Meter value={mid} max={target} tone={remaining < 0 ? 'warn' : 'lime'} />
        </Card>

        <SectionTitle>{t('meals.title')}</SectionTitle>

        {entries.length === 0 ? (
          <Card>
            <Body>{t('meals.empty')}</Body>
          </Card>
        ) : (
          <Card>
            {entries.map((entry, i) => (
              <View key={entry.id}>
                {i > 0 ? <Divider /> : null}
                <View style={s.meal}>
                  <View style={s.grow}>
                    <Text style={s.label}>{entry.label}</Text>
                    <Small>
                      {entry.correctedKcal
                        ? `${entry.correctedKcal} ${t('common.kcal')}`
                        : formatRange(entry.estimate.kcal, t('common.kcal'))}
                      {entry.status === 'estimating' ? ` · ${t('meals.analyzing')}` : ''}
                    </Small>
                  </View>
                  <Button
                    label={t('meals.correct')}
                    variant="ghost"
                    onPress={() => setCorrecting(correcting === entry.id ? null : entry.id)}
                  />
                </View>
                {correcting === entry.id ? (
                  <Correction entry={entry} onDone={() => setCorrecting(null)} />
                ) : null}
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

const s = StyleSheet.create({
  grow: { flex: 1 },
  meal: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  label: { ...type.body, fontWeight: '700', color: colors.text },
  correction: { gap: space.sm, paddingBottom: space.sm },
  saveBtn: { minHeight: 48, paddingHorizontal: space.lg },
})
