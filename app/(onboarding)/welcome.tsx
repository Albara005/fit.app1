import { router } from 'expo-router'
import { Text, View } from 'react-native'
import { Wordmark } from '../../components/Brand'
import { Body, Button, Caption, Card, Display, Divider, Row, Screen, Segmented, Spacer } from '../../components/ui'
import { makeStyles } from '../../lib/design/theme'
import { space } from '../../lib/design/tokens'
import { type } from '../../lib/design/typography'
import { useT } from '../../lib/i18n/useT'
import { useOnboarding } from '../../lib/store/onboarding'
import { useSettings } from '../../lib/store/settings'

/** The three loops, in nesting order: a day inside a week inside a phase. */
const LOOPS = [
  ['onboarding.loopDaily', 'onboarding.loopDailyTime'],
  ['onboarding.loopWeekly', 'onboarding.loopWeeklyTime'],
  ['onboarding.loopPhase', 'onboarding.loopPhaseTime'],
] as const

export default function Welcome() {
  const { t, locale } = useT()
  const setLocale = useSettings((state) => state.setLocale)
  const s = useStyles()

  return (
    <Screen
      footer={
        <>
          <Button
            label={t('onboarding.welcomeCta')}
            onPress={() => {
              // A fresh start, so nothing answered by an earlier session — or by
              // an account that was just deleted — is carried in unasked.
              useOnboarding.getState().reset()
              router.push('/(onboarding)/basics')
            }}
          />
          <Caption style={s.center}>{t('onboarding.welcomeMinutes')}</Caption>
        </>
      }
    >
      <Row>
        <Wordmark size={44} />
        <View style={s.grow} />
        <View style={s.lang}>
          <Segmented
            label={t('common.language')}
            options={[
              { value: 'ar', label: 'عربي' },
              { value: 'en', label: 'EN' },
            ]}
            value={locale}
            onChange={setLocale}
          />
        </View>
      </Row>

      <Spacer size={space.xxl} />
      <Display>{t('onboarding.welcomeTitle')}</Display>
      <Body muted>{t('onboarding.welcomeBody')}</Body>

      <Spacer size={space.md} />
      <Card>
        {LOOPS.map(([name, time], i) => (
          <View key={name}>
            {i > 0 ? <Divider /> : null}
            <Row style={s.loop}>
              <Text style={s.index}>{i + 1}</Text>
              <Body strong style={s.grow}>
                {t(name)}
              </Body>
              <Caption>{t(time)}</Caption>
            </Row>
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const useStyles = makeStyles((p) => ({
  grow: { flex: 1 },
  lang: { width: 132 },
  center: { alignSelf: 'center' },
  loop: { paddingVertical: space.xs, gap: space.md },
  index: { ...type.numeralSmall, color: p.accent, minWidth: 20 },
}))
