import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { View } from 'react-native'
import { Body, Button, Caption, Screen, Title } from '../../components/ui'
import { isSupabaseConfigured } from '../../lib/data'
import { analyzeMealPhoto } from '../../lib/data/edge'
import { useAddMeal, useUpdateMeal } from '../../lib/data/queries'
import { newId } from '../../lib/data/repo'
import { makeStyles } from '../../lib/design/theme'
import { radius } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { estimateMeal } from '../../lib/nutrition/estimate'

/**
 * Optimistic by design. The meal is in the log before the shutter sound
 * finishes, carrying a provisional estimate and an "analysing" state, and the
 * user is free to leave. If the analysis never lands — no server, no consent,
 * a dropped connection — the entry keeps its provisional numbers and the two
 * tap questions still fix most of the error. There is no error state and
 * nothing to retry.
 */
const PROVISIONAL = { kcal: 450, protein: 22, carbs: 48, fat: 18 }

export default function Photo() {
  const { t } = useT()
  const s = useStyles()
  const [permission, requestPermission] = useCameraPermissions()
  const camera = useRef<CameraView>(null)
  const [busy, setBusy] = useState(false)
  const addMeal = useAddMeal()
  const updateMeal = useUpdateMeal()

  if (!isSupabaseConfigured()) {
    return (
      <Screen center footer={<Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />}>
        <Title>{t('meals.photo')}</Title>
        {/* Analysis needs the edge function that holds the model key. Saying so
            is better than a camera that opens and then does nothing. */}
        <Body muted>{t('meals.photoNeedsServer')}</Body>
      </Screen>
    )
  }

  if (!permission?.granted) {
    return (
      <Screen center footer={<Button label={t('meals.photoAllow')} icon="camera" onPress={requestPermission} />}>
        <Title>{t('meals.photo')}</Title>
        <Body muted>{t('meals.photoPermission')}</Body>
      </Screen>
    )
  }

  async function capture() {
    if (busy) return
    setBusy(true)

    const shot = await camera.current?.takePictureAsync({ base64: true, quality: 0.6 })
    if (!shot?.base64) {
      setBusy(false)
      return
    }

    const id = newId()
    addMeal.mutate({
      id,
      loggedAt: new Date().toISOString(),
      dishId: null,
      label: t('meals.analyzing'),
      cookMethod: null,
      portion: null,
      estimate: estimateMeal({ base: PROVISIONAL, source: 'photo', cookMethod: null, portion: null }),
      status: 'estimating',
    })
    router.back()

    // Deliberately not awaited before navigating: the photo is analysed while
    // the user gets on with their day, and the image itself is never written to
    // disk on either side.
    const base = await analyzeMealPhoto(shot.base64)
    if (!base) return
    updateMeal.mutate({
      id,
      patch: {
        label: base.label,
        status: 'ready',
        estimate: estimateMeal({ base, source: 'photo', cookMethod: base.looksFried ? 'fried' : null, portion: null }),
      },
    })
  }

  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button label={t('meals.photo')} icon="camera" loading={busy} onPress={capture} />
          <Caption style={{ alignSelf: 'center' }}>{t('meals.photoNotStored')}</Caption>
        </>
      }
    >
      <View style={s.frame}>
        <CameraView ref={camera} style={{ flex: 1 }} facing="back" />
      </View>
    </Screen>
  )
}

const useStyles = makeStyles((p) => ({
  frame: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: p.line,
    backgroundColor: p.surface,
  },
}))
