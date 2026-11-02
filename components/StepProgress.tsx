import { useT } from '../lib/i18n/useT'
import { Progress } from './ui'

/** Basics, goal, activity, equipment, injuries, allergies, consent. */
const TOTAL = 7

export function StepProgress({ step }: { step: number }) {
  const { t } = useT()
  return <Progress current={step} total={TOTAL} label={t('onboarding.step', { current: step, total: TOTAL })} />
}
