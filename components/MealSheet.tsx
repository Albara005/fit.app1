import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Body, Button, Card, Chip, Input, Row, Screen, SectionTitle, Small, Spacer, Title, Wrap } from './ui'
import { useAddMeal, useCorrections, useProfile } from '../lib/data/queries'
import { newId } from '../lib/data/repo'
import { useT } from '../lib/i18n/useT'
import { DISHES } from '../lib/nutrition/dishes'
import { estimateMeal, formatRange, type EstimateSource, type Macros } from '../lib/nutrition/estimate'
import { dishKey, memoryLine, recall } from '../lib/nutrition/memory'
import { colors, radius, space } from '../lib/theme'
import type { CookMethod, PortionSize } from '../lib/types'

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
  // gate would reject teaches people to distrust the whole list.
  const quickPicks = useMemo(
    () =>
      DISHES.filter(
        (d) => !d.contains.some((a) => profile?.allergies.includes(a)) && d.role !== 'fat',
      ).slice(0, 8),
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
          <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
        </>
      }
    >
      <Title>{t('meals.addMeal')}</Title>

      <Input
        value={label}
        onChangeText={(text) => {
          setLabel(text)
          setPickedId(null)
        }}
        placeholder={t('meals.manual')}
      />

      <Wrap>
        {quickPicks.map((dish) => (
          <Chip
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

      {memory ? (
        <Card tone="accent">
          <Small>{t('meals.remembered')}</Small>
          <Body muted={false}>{memoryLine(finalLabel, memory, locale)}</Body>
        </Card>
      ) : null}

      {/* The two questions that fix most of the error, asked as taps. */}
      <SectionTitle>{t('meals.howCooked')}</SectionTitle>
      <Row>
        {COOK.map((value) => (
          <Chip key={value} label={t(`meals.${value}`)} selected={cookMethod === value} onPress={() => setCook(value)} />
        ))}
      </Row>

      <SectionTitle>{t('meals.howBig')}</SectionTitle>
      <Row>
        {PORTIONS.map((value) => (
          <Chip key={value} label={t(`meals.${value}`)} selected={portion === value} onPress={() => setPortion(value)} />
        ))}
      </Row>
      <Small>{t('meals.twoTaps')}</Small>

      {estimate ? (
        <>
          <Spacer size={space.sm} />
          <Card>
            <Row>
              <Body muted={false} style={s.grow}>
                {formatRange(estimate.kcal, t('common.kcal'))}
              </Body>
              <View style={s.confidence}>
                <Small style={s.confidenceText}>{confidenceLabel}</Small>
              </View>
            </Row>
            <Small>
              {t('plan.protein')} {formatRange(estimate.protein, t('common.gram'))} · {t('plan.carbs')}{' '}
              {formatRange(estimate.carbs, t('common.gram'))} · {t('plan.fat')}{' '}
              {formatRange(estimate.fat, t('common.gram'))}
            </Small>
            <Small style={s.note}>{t('meals.fatNote')}</Small>
          </Card>
        </>
      ) : null}
    </Screen>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  confidence: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  confidenceText: { color: colors.sand },
  note: { color: colors.textFaint },
})
