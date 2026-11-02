import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useAddMeal, useCorrections, useProfile } from '../lib/data/queries'
import { newId } from '../lib/data/repo'
import { space } from '../lib/design/tokens'
import { useT } from '../lib/i18n/useT'
import { DISHES } from '../lib/nutrition/dishes'
import { estimateMeal, formatRange, type EstimateSource, type Macros } from '../lib/nutrition/estimate'
import { dishKey, memoryLine, recall } from '../lib/nutrition/memory'
import type { CookMethod, PortionSize } from '../lib/types'
import {
  Badge, Body, Button, Caption, Card, CoachLine, Field, Grow, Pill, Row, Screen, Section, Segmented, Title, Wrap,
} from './ui'

const COOK: CookMethod[] = ['fried', 'grilled', 'boiled']
const PORTIONS: PortionSize[] = ['half', 'normal', 'large']

export function MealSheet({ onClose }: { onClose: () => void }) {
  const { t, locale } = useT()
  const { data: profile } = useProfile()
  const { data: corrections } = useCorrections()
  const addMeal = useAddMeal()

  const [label, setLabel] = useState('')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [cookMethod, setCook] = useState<CookMethod | null>(null)
  const [portion, setPortion] = useState<PortionSize | null>(null)

  // Only dishes the profile can actually eat. Offering a quick-pick that the
  // gate would reject teaches people to distrust the whole list. Each dish's
  // `contains` is held to the gate's own reading by tests/nutrition/dishes-gate.
  const quickPicks = useMemo(
    () =>
      DISHES.filter((d) => !d.contains.some((a) => profile?.allergies.includes(a)) && d.role !== 'fat').slice(0, 8),
    [profile?.allergies],
  )

  const picked = DISHES.find((d) => d.id === pickedId) ?? null
  const finalLabel = picked ? picked.name[locale] : label.trim()
  const key = finalLabel ? dishKey(finalLabel) : ''
  const memory = key ? recall(corrections ?? [], key) : null

  const base: Macros | null = memory
    ? { kcal: memory.kcal, protein: 25, carbs: 55, fat: 20 }
    : picked
      ? {
          kcal: Math.round((picked.per100g.kcal * picked.servingG) / 100),
          protein: Math.round((picked.per100g.protein * picked.servingG) / 100),
          carbs: Math.round((picked.per100g.carbs * picked.servingG) / 100),
          fat: Math.round((picked.per100g.fat * picked.servingG) / 100),
        }
      : finalLabel
        ? { kcal: 450, protein: 22, carbs: 48, fat: 18 }
        : null

  const source: EstimateSource = memory ? 'memory' : picked ? 'library' : 'photo'
  const estimate = base ? estimateMeal({ base, source, cookMethod, portion }) : null

  const confidenceLabel = estimate
    ? t(
        estimate.confidence === 'high'
          ? 'meals.confidenceHigh'
          : estimate.confidence === 'medium'
            ? 'meals.confidenceMedium'
            : 'meals.confidenceLow',
      )
    : ''

  return (
    <Screen
      footer={
        <>
          <Button
            label={t('common.save')}
            disabled={!estimate}
            onPress={() => {
              if (!estimate) return
              addMeal.mutate({
                id: newId(),
                loggedAt: new Date().toISOString(),
                dishId: picked?.id ?? null,
                label: finalLabel,
                cookMethod,
                portion,
                estimate,
                status: 'ready',
              })
              onClose()
            }}
          />
          <Button label={t('common.cancel')} variant="quiet" onPress={onClose} />
        </>
      }
    >
      <Title>{t('meals.addMeal')}</Title>

      <Field
        label={t('meals.manual')}
        value={label}
        onChangeText={(text) => {
          setLabel(text)
          setPickedId(null)
        }}
      />

      <Wrap>
        {quickPicks.map((dish) => (
          <Pill
            key={dish.id}
            label={dish.name[locale]}
            selected={pickedId === dish.id}
            onPress={() => {
              setPickedId(dish.id)
              setLabel('')
            }}
          />
        ))}
      </Wrap>

      {memory ? <CoachLine label={t('meals.remembered')}>{memoryLine(finalLabel, memory, locale)}</CoachLine> : null}

      {/* The two questions that fix most of the error, asked as taps. */}
      <Section title={t('meals.howCooked')}>
        <Segmented
          label={t('meals.howCooked')}
          options={COOK.map((value) => ({ value, label: t(`meals.${value}`) }))}
          value={cookMethod}
          onChange={setCook}
        />
      </Section>
      <Section title={t('meals.howBig')}>
        <Segmented
          label={t('meals.howBig')}
          options={PORTIONS.map((value) => ({ value, label: t(`meals.${value}`) }))}
          value={portion}
          onChange={setPortion}
        />
      </Section>
      <Caption>{t('meals.twoTaps')}</Caption>

      {estimate ? (
        <Card>
          <Row>
            <Body strong style={{ flex: 1 }}>
              {formatRange(estimate.kcal, t('common.kcal'))}
            </Body>
            <Grow />
            <Badge label={confidenceLabel} />
          </Row>
          <View style={{ gap: 2 }}>
            <Caption>
              {t('plan.protein')} {formatRange(estimate.protein, t('common.gram'))}
            </Caption>
            <Caption>
              {t('plan.carbs')} {formatRange(estimate.carbs, t('common.gram'))}
            </Caption>
            <Caption>
              {t('plan.fat')} {formatRange(estimate.fat, t('common.gram'))}
            </Caption>
          </View>
          <Caption style={{ marginTop: space.xs }}>{t('meals.fatNote')}</Caption>
        </Card>
      ) : null}
    </Screen>
  )
}
