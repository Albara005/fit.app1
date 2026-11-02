import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Badge, Body, Button, Card, Divider, Heading, Screen, Section, SwitchRow, Wrap,
} from '../components/ui'
import { SUPABASE_REGION, isSupabaseConfigured } from '../lib/data'
import { useConsents, useDeleteEverything, useSetConsent } from '../lib/data/queries'
import type { ConsentKind } from '../lib/data/repo'
import { space } from '../lib/design/tokens'
import { useT } from '../lib/i18n/useT'
import { MODEL_SAFE_KEYS } from '../lib/privacy/modelSafe'

function Block({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: space.xs, paddingVertical: space.xs }}>
      <Heading>{title}</Heading>
      <Body muted>{body}</Body>
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

  const backed = isSupabaseConfigured()

  return (
    <Screen>
      <Card>
        <Block title={t('privacy.whatTitle')} body={t('privacy.whatBody')} />
        <Divider />
        <Block
          title={t('privacy.whereTitle')}
          body={backed ? t('privacy.whereBody', { region: SUPABASE_REGION }) : t('privacy.whereLocal')}
        />
        <Divider />
        <Block title={t('privacy.howLongTitle')} body={t('privacy.howLongBody')} />
      </Card>

      <Card>
        <Block title={t('privacy.modelTitle')} body={t('privacy.modelBody')} />
        <Wrap>
          {MODEL_SAFE_KEYS.map((key) => (
            <Badge key={key} label={t(`privacy.field.${key}`)} />
          ))}
        </Wrap>
      </Card>

      <Card>
        <Block title={t('privacy.photosTitle')} body={t('privacy.photosBody')} />
        <Divider />
        {/* A barcode lookup leaves the device too. Smaller than the model call,
            and still something a page that claims to list everything has to list. */}
        <Block title={t('privacy.barcodeTitle')} body={t('privacy.barcodeBody')} />
        <Divider />
        <Block title={t('privacy.logsTitle')} body={t('privacy.logsBody')} />
      </Card>

      <Section title={t('privacy.consentTitle')}>
        <Card style={{ paddingVertical: space.xs }}>
          {(['processing', 'cross_border_transfer'] as ConsentKind[]).map((kind, i) => {
            const granted = consents?.[kind] ?? false
            return (
              <View key={kind}>
                {i > 0 ? <Divider /> : null}
                <SwitchRow
                  label={t(kind === 'processing' ? 'consent.processing' : 'consent.transfer')}
                  detail={t(granted ? 'privacy.consentGranted' : 'privacy.consentDenied')}
                  value={granted}
                  onValueChange={(next) => setConsent.mutate({ kind, granted: next })}
                />
              </View>
            )
          })}
        </Card>
      </Section>

      <Section title={t('privacy.deleteTitle')}>
        <Card tone="danger">
          <Body>{t('privacy.deleteBody')}</Body>
          {confirming ? (
            <>
              <Button
                label={t('privacy.deleteConfirm')}
                variant="danger"
                loading={deleteEverything.isPending}
                onPress={async () => {
                  await deleteEverything.mutateAsync()
                  router.replace('/(onboarding)/welcome')
                }}
              />
              <Button label={t('common.cancel')} variant="quiet" onPress={() => setConfirming(false)} />
            </>
          ) : (
            <Button label={t('privacy.deleteTitle')} variant="danger" onPress={() => setConfirming(true)} />
          )}
        </Card>
      </Section>
    </Screen>
  )
}
