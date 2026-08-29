import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Wordmark } from '../../components/Brand'
import { Body, Button, Card, Input, Screen, Small, Spacer, Title } from '../../components/ui'
import { isCodeShaped, isEmailShaped } from '../../lib/auth/credentials'
import { requestCode, verifyCode } from '../../lib/auth/session'
import { useT } from '../../lib/i18n/useT'
import { colors, space } from '../../lib/theme'

type Stage = 'email' | 'code'

export default function SignIn() {
  const { t } = useT()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!isEmailShaped(email)) {
      setError(t('auth.invalidEmail'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await requestCode(email.trim())
      setStage('code')
    } catch {
      // Distinct from a verify failure: at this stage there is no code yet, so
      // telling someone to check theirs is advice they cannot act on.
      setError(t('auth.sendFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (!isCodeShaped(code)) {
      setError(t('auth.invalidCode'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyCode(email.trim(), code.trim())
      // The index route decides where a signed-in person belongs — onboarding
      // if there is no profile yet, today if there is.
      router.replace('/')
    } catch {
      setError(t('auth.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      footer={
        stage === 'email' ? (
          <Button label={t('auth.sendCode')} loading={busy} onPress={send} />
        ) : (
          <>
            <Button label={t('auth.verify')} loading={busy} onPress={verify} />
            <Button
              label={t('auth.changeEmail')}
              variant="ghost"
              onPress={() => {
                setStage('email')
                setCode('')
                setError(null)
              }}
            />
          </>
        )
      }
    >
      <Spacer size={space.xl} />
      <Wordmark size={44} />
      <Spacer size={space.xl} />
      <Title>{t('auth.title')}</Title>
      <Body>{t('auth.intro')}</Body>
      <Spacer size={space.sm} />

      {stage === 'email' ? (
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.email')}
          inputMode="text"
        />
      ) : (
        <View style={s.stack}>
          <Small>{t('auth.codeSent', { email: email.trim() })}</Small>
          <Input value={code} onChangeText={setCode} placeholder={t('auth.code')} inputMode="numeric" />
          <Button label={t('auth.resend')} variant="ghost" onPress={send} />
        </View>
      )}

      {error ? (
        <Card tone="danger">
          <Body muted={false}>{error}</Body>
        </Card>
      ) : null}
    </Screen>
  )
}

const s = StyleSheet.create({
  stack: { gap: space.sm },
})
