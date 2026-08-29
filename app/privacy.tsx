import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  Body, Button, Card, Divider, Row, Screen, SectionTitle, Small, Spacer,
} from '../components/ui'
import { useConsents, useDeleteEverything, useSetConsent } from '../lib/data/queries'
import { SUPABASE_REGION, isSupabaseConfigured } from '../lib/data'
import { useT } from '../lib/i18n/useT'
import { MODEL_SAFE_KEYS } from '../lib/privacy/modelSafe'
import { colors, radius, space, type } from '../lib/theme'
import type { ConsentKind } from '../lib/data/repo'

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Body>{body}</Body>
    </View>
  )
}

/**
 * A separate screen, not a paragraph buried in settings: what is stored, where,
 * for how long, and exactly what leaves the device. The field list is rendered
 * from the allowlist itself, so this page cannot describe a payload that
 * differs from the one actually sent.
 */
export default function Privacy() {
  const { t } = useT()
  const { data: consents } = useConsents()
  const setConsent = useSetConsent()
  const deleteEverything = useDeleteEverything()
  const [confirming, setConfirming] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const backed = isSupabaseConfigured()

  return (
    <Screen>
      <Card>
        <Section title={t('privacy.whatTitle')} body={t('privacy.whatBody')} />
        <Divider />
        <Section
          title={t('privacy.whereTitle')}
          body={backed ? t('privacy.whereBody', { region: SUPABASE_REGION }) : t('privacy.whereLocal')}
        />
        <Divider />
        <Section title={t('privacy.howLongTitle')} body={t('privacy.howLongBody')} />
      </Card>

      <Card>
        <Section title={t('privacy.modelTitle')} body={t('privacy.modelBody')} />
        <View style={s.fields}>
          {MODEL_SAFE_KEYS.map((key) => (
            <View key={key} style={s.field}>
              <Small style={s.fieldText}>{t(`privacy.field.${key}`)}</Small>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Section title={t('privacy.photosTitle')} body={t('privacy.photosBody')} />
        <Divider />
        <Section title={t('privacy.logsTitle')} body={t('privacy.logsBody')} />
      </Card>

      <SectionTitle>{t('privacy.consentTitle')}</SectionTitle>
      <Card>
        {(['processing', 'cross_border_transfer'] as ConsentKind[]).map((kind, i) => {
          const granted = consents?.[kind] ?? false
          return (
            <View key={kind}>
              {i > 0 ? <Divider /> : null}
              <Row style={s.consent}>
                <View style={s.grow}>
                  <Text style={s.consentTitle}>
                    {t(kind === 'processing' ? 'consent.processing' : 'consent.transfer')}
                  </Text>
                  <Small style={granted ? s.granted : s.denied}>
                    {t(granted ? 'privacy.consentGranted' : 'privacy.consentDenied')}
                  </Small>
                </View>
                <Button
                  label={t(granted ? 'privacy.revoke' : 'privacy.grant')}
                  variant="secondary"
                  onPress={() => setConsent.mutate({ kind, granted: !granted })}
                />
              </Row>
            </View>
          )
        })}
      </Card>

      <SectionTitle>{t('privacy.deleteTitle')}</SectionTitle>
      <Card tone="danger">
        <Body>{t('privacy.deleteBody')}</Body>
        {deleted ? (
          <Body muted={false}>{t('privacy.deleteDone')}</Body>
        ) : confirming ? (
          <>
            <Button
              label={t('privacy.deleteConfirm')}
              variant="danger"
              loading={deleteEverything.isPending}
              onPress={async () => {
                await deleteEverything.mutateAsync()
                setDeleted(true)
                router.replace('/(onboarding)/welcome')
              }}
            />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setConfirming(false)} />
          </>
        ) : (
          <Button label={t('privacy.deleteTitle')} variant="danger" onPress={() => setConfirming(true)} />
        )}
      </Card>
      <Spacer size={space.xl} />
    </Screen>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  section: { gap: space.xs, paddingVertical: space.xs },
  sectionTitle: { ...type.heading, color: colors.sand },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  field: {
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  fieldText: { color: colors.textMute },
  consent: { paddingVertical: space.sm },
  consentTitle: { ...type.body, fontWeight: '700', color: colors.text },
  granted: { color: colors.ok },
  denied: { color: colors.textFaint },
})
