import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Wordmark } from '../../components/Brand'
import { Body, Button, Field, Screen, Spacer, Title } from '../../components/ui'
import { isCodeShaped, isEmailShaped } from '../../lib/auth/credentials'
import { requestCode, verifyCode } from '../../lib/auth/session'
import { space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'

type Stage = 'email' | 'code'

export default function SignIn() {
  const { t } = useT()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A ref, not the busy state: two Enter presses land before a re-render, and
  // each would send its own request — the second verify failing on a code the
  // first already used.
  const inFlight = useRef(false)

  async function send() {
    if (inFlight.current) return
    if (!isEmailShaped(email)) {
      setError(t('auth.invalidEmail'))
      return
    }
    inFlight.current = true
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
      inFlight.current = false
      setBusy(false)
    }
  }

  async function verify() {
    if (inFlight.current) return
    if (!isCodeShaped(code)) {
      setError(t('auth.invalidCode'))
      return
    }
    inFlight.current = true
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
      inFlight.current = false
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
            <Button label={t('auth.resend')} variant="quiet" disabled={busy} onPress={send} />
          </>
        )
      }
    >
      <Spacer size={space.lg} />
      <Wordmark size={44} />
      <Spacer size={space.lg} />
      <Title>{t('auth.title')}</Title>
      <Body muted>{t('auth.intro')}</Body>
      <Spacer size={space.sm} />

      {/* Autocomplete hints let the platform fill the address and lift the
          code straight out of the email — the whole sign-in can be two taps. */}
      {stage === 'email' ? (
        <Field
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          error={error}
          inputMode="email"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={send}
        />
      ) : (
        <>
          <Field
            label={t('auth.code')}
            hint={t('auth.codeSent', { email: email.trim() })}
            value={code}
            onChangeText={setCode}
            error={error}
            inputMode="numeric"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={verify}
            autoFocus
          />
          <Button
            label={t('auth.changeEmail')}
            variant="quiet"
            onPress={() => {
              setStage('email')
              setCode('')
              setError(null)
            }}
          />
        </>
      )}
    </Screen>
  )
}
