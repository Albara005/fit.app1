import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { View } from 'react-native'
import { Body, Button, Caption, Card, Field, Row, Screen, Section, Title } from '../../components/ui'
import { useAddMeal } from '../../lib/data/queries'
import { newId } from '../../lib/data/repo'
import { makeStyles } from '../../lib/design/theme'
import { radius, space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { estimateMeal } from '../../lib/nutrition/estimate'
import { lookupBarcode } from '../../lib/nutrition/foodDb'
import { EMPTY_LABEL, macrosForServing, validateLabel, type LabelDraft } from '../../lib/nutrition/label'

type FieldKey = keyof LabelDraft

/**
 * The cheapest and most accurate way to log a packaged food, and it calls no
 * model at all: the panel already states the answer, and the barcode resolves
 * to a database row. A vision model here would cost money to be worse than
 * arithmetic.
 */
export default function Label() {
  const { t } = useT()
  const s = useStyles()
  const [draft, setDraft] = useState<LabelDraft>(EMPTY_LABEL)
  const [name, setName] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  // The camera fires this callback once per frame while a barcode is in view.
  // A ref rather than state: a state update lands too late to stop the frames
  // already queued, and each one would be its own network lookup.
  const handled = useRef(false)
  const addMeal = useAddMeal()

  const validation = validateLabel(draft)
  const set = (field: FieldKey) => (value: string) => setDraft((d) => ({ ...d, [field]: value }))
  // Marked only after a failed save, and on the field itself — four identical
  // boxes with one error at the bottom leaves the user guessing which.
  const errorFor = (field: FieldKey) =>
    showErrors && validation.invalid.includes(field) ? t('meals.enterNumber') : null

  async function onScan(code: string) {
    if (handled.current) return
    handled.current = true
    setScanning(false)
    const product = await lookupBarcode(code)
    if (!product) {
      // Not an error state: the label fields are right there.
      setNotice(t('meals.scanFailed'))
      return
    }
    setNotice(null)
    setName(product.name)
    setDraft((d) => ({
      ...d,
      kcal: String(product.per100g.kcal),
      protein: String(product.per100g.protein),
      carbs: String(product.per100g.carbs),
      fat: String(product.per100g.fat),
    }))
  }

  function save() {
    if (!validation.per100g || validation.grams === null) {
      setShowErrors(true)
      return
    }
    const base = macrosForServing(validation.per100g, validation.grams)
    addMeal.mutate({
      id: newId(),
      loggedAt: new Date().toISOString(),
      dishId: null,
      label: name.trim() || t('meals.labelTitle'),
      cookMethod: null,
      portion: null,
      estimate: estimateMeal({ base, source: 'label', cookMethod: null, portion: null }),
      status: 'ready',
    })
    router.back()
  }

  if (scanning) {
    return (
      <Screen
        scroll={false}
        footer={<Button label={t('common.cancel')} variant="secondary" onPress={() => setScanning(false)} />}
      >
        <View style={s.frame}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => void onScan(data)}
          />
        </View>
        <Caption style={{ alignSelf: 'center' }}>{t('meals.scanning')}</Caption>
      </Screen>
    )
  }

  const numeric = (field: Exclude<FieldKey, 'grams'>, labelKey: string) => (
    <Field
      label={t(labelKey)}
      value={draft[field]}
      onChangeText={set(field)}
      inputMode="decimal"
      error={errorFor(field)}
      style={{ flex: 1 }}
    />
  )

  return (
    <Screen
      footer={
        <>
          <Button label={t('common.save')} onPress={save} />
          <Button
            label={t('meals.scan')}
            icon="barcode"
            variant="secondary"
            onPress={async () => {
              if (!permission?.granted && !(await requestPermission()).granted) return
              setNotice(null)
              handled.current = false
              setScanning(true)
            }}
          />
        </>
      }
    >
      <Title>{t('meals.labelTitle')}</Title>
      <Body muted>{t('meals.labelIntro')}</Body>

      {notice ? (
        <Card tone="raised">
          <Body>{notice}</Body>
        </Card>
      ) : null}

      <Field label={t('meals.productName')} value={name} onChangeText={setName} />

      <Section title={t('meals.per100g')}>
        <Row style={{ alignItems: 'flex-start', gap: space.md }}>
          {numeric('kcal', 'meals.kcalField')}
          {numeric('protein', 'meals.proteinField')}
        </Row>
        <Row style={{ alignItems: 'flex-start', gap: space.md }}>
          {numeric('carbs', 'meals.carbsField')}
          {numeric('fat', 'meals.fatField')}
        </Row>
      </Section>

      <Field
        label={t('meals.gramsField')}
        value={draft.grams}
        onChangeText={set('grams')}
        inputMode="decimal"
        error={errorFor('grams')}
      />

      {/* A warning, not a block: panels round, and fibre is counted differently
          across jurisdictions, so the user's reading wins. */}
      {validation.inconsistent ? (
        <Card tone="warn">
          <Body>{t('meals.inconsistent')}</Body>
        </Card>
      ) : null}
    </Screen>
  )
}

const useStyles = makeStyles((p) => ({
  frame: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: p.surface },
}))
