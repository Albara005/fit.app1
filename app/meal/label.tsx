import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Body, Button, Card, Input, Row, Screen, SectionTitle, Small, Spacer, Title } from '../../components/ui'
import { useAddMeal } from '../../lib/data/queries'
import { newId } from '../../lib/data/repo'
import { useT } from '../../lib/i18n/useT'
import { estimateMeal } from '../../lib/nutrition/estimate'
import { lookupBarcode } from '../../lib/nutrition/foodDb'
import {
  EMPTY_LABEL, macrosForServing, validateLabel, type LabelDraft,
} from '../../lib/nutrition/label'
import { colors, space } from '../../lib/theme'

type Field = Exclude<keyof LabelDraft, never>

/**
 * The cheapest and most accurate way to log a packaged food, and it calls no
 * model at all: the panel already states the answer, and the barcode resolves
 * to a database row. A vision model here would cost money to be worse than
 * arithmetic.
 */
export default function Label() {
  const { t } = useT()
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
  const set = (field: Field) => (value: string) => setDraft((d) => ({ ...d, [field]: value }))
  const invalid = (field: Field) => showErrors && validation.invalid.includes(field)

  async function onScan(code: string) {
    if (handled.current) return
    handled.current = true
    setScanning(false)
    const product = await lookupBarcode(code)
    if (!product) {
      // Not an error state: the label fields are right there, already focused
      // on the work the user came to do.
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
            style={s.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => void onScan(data)}
          />
        </View>
        <Small style={s.hint}>{t('meals.scanning')}</Small>
      </Screen>
    )
  }

  return (
    <Screen
      footer={
        <>
          <Button label={t('common.save')} onPress={save} />
          <Button
            label={t('meals.scan')}
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
      <Body>{t('meals.labelIntro')}</Body>

      {notice ? (
        <Card>
          <Small>{notice}</Small>
        </Card>
      ) : null}

      <Spacer size={space.xs} />
      <Input value={name} onChangeText={setName} placeholder={t('meals.productName')} />

      <SectionTitle>{t('meals.per100g')}</SectionTitle>
      <Row>
        <Input
          value={draft.kcal} onChangeText={set('kcal')} inputMode="decimal"
          placeholder={t('meals.kcalField')} invalid={invalid('kcal')} style={s.grow}
        />
        <Input
          value={draft.protein} onChangeText={set('protein')} inputMode="decimal"
          placeholder={t('meals.proteinField')} invalid={invalid('protein')} style={s.grow}
        />
      </Row>
      <Row>
        <Input
          value={draft.carbs} onChangeText={set('carbs')} inputMode="decimal"
          placeholder={t('meals.carbsField')} invalid={invalid('carbs')} style={s.grow}
        />
        <Input
          value={draft.fat} onChangeText={set('fat')} inputMode="decimal"
          placeholder={t('meals.fatField')} invalid={invalid('fat')} style={s.grow}
        />
      </Row>

      <SectionTitle>{t('meals.gramsField')}</SectionTitle>
      <Input
        value={draft.grams} onChangeText={set('grams')} inputMode="decimal"
        placeholder="45" invalid={invalid('grams')}
      />

      {showErrors && validation.invalid.length > 0 ? (
        <Card tone="danger">
          <Small>{t('meals.fillFields')}</Small>
        </Card>
      ) : null}

      {/* A warning, not a block: panels round, and fibre is counted differently
          across jurisdictions, so the user's reading wins. */}
      {validation.inconsistent ? (
        <Card>
          <Small style={s.warn}>{t('meals.inconsistent')}</Small>
        </Card>
      ) : null}
    </Screen>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  frame: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surface },
  camera: { flex: 1 },
  hint: { alignSelf: 'center', marginTop: space.sm },
  warn: { color: colors.warn },
})
