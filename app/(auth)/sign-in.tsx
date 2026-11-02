import { router } from 'expo-router'
import { useState } from 'react'
import { Wordmark } from '../../components/Brand'
import { Body, Button, Field, Screen, Spacer, Title } from '../../components/ui'
import { isCodeShaped, isEmailShaped } from '../../lib/auth/credentials'
import { requestCode, verifyCode } from '../../lib/auth/session'
import { space } from '../../lib/design/tokens'
import { useT } from '../../lib/i18n/useT'
import { useSingleFlight } from '../../lib/singleFlight'

type Stage = 'email' | 'code'

export default function SignIn() {
  const { t } = useT()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  // One guard for the buttons and the keyboard's Enter alike: two presses land
  // before a re-render, and the second verify would fail on a code the first
  // already used.
  const [busy, once] = useSingleFlight()

  async function send() {
    if (!isEmailShaped(email)) {
      setError(t('auth.invalidEmail'))
      return
    }
    setError(null)
    try {
      await requestCode(email.trim())
      setStage('code')
    } catch {
      // Distinct from a verify failure: at this stage there is no code yet, so
      // telling someone to check theirs is advice they cannot act on.
      setError(t('auth.sendFailed'))
    }
  }

  async function verify() {
    if (!isCodeShaped(code)) {
      setError(t('auth.invalidCode'))
      return
    }
    setError(null)
    try {
      await verifyCode(email.trim(), code.trim())
      // The index route decides where a signed-in person belongs — onboarding
      // if there is no profile yet, today if there is.
      router.replace('/')
    } catch {
      setError(t('auth.failed'))
    }
  }

  return (
    <Screen
      footer={
        stage === 'email' ? (
          <Button label={t('auth.sendCode')} loading={busy} onPress={() => once(send)} />
        ) : (
          <>
            <Button label={t('auth.verify')} loading={busy} onPress={() => once(verify)} />
            <Button label={t('auth.resend')} variant="quiet" disabled={busy} onPress={() => once(send)} />
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
          onSubmitEditing={() => once(send)}
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
            onSubmitEditing={() => once(verify)}
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
