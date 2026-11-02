import type { Repo } from '../data/repo'
import { gate, type GateResult, type Verdict } from '../safety/gate'
import type { DerivedProfile, Plan } from '../types'
import { buildTemplatePlan } from './engine'

export interface PlanRequest {
  repo: Repo
  profile: DerivedProfile
  weekIndex: number
  /** Returns a model-built plan, or null when the model is unavailable. */
  fromModel?: (profile: DerivedProfile, weekIndex: number) => Promise<Plan | null>
}

export interface PlanOutcome {
  plan: Plan | null
  verdict: Verdict
  substitutions: GateResult['substitutions']
  /** True when a model plan was rejected and the rules-based one shipped. */
  fellBack: boolean
}

async function record(repo: Repo, result: GateResult, source: Plan['source'], attempt: number) {
  for (const reason of result.reasons) {
    await repo.logRejection({
      verdict: result.verdict,
      code: reason.code,
      ...(reason.allergen && { allergen: reason.allergen }),
      ...(reason.matchKind && { matchKind: reason.matchKind }),
      ...(reason.term && { term: reason.term }),
      attempt,
      planSource: source,
    })
  }
}

/**
 * The only way a plan reaches a screen.
 *
 * A model plan that fails the gate is not repaired and not retried here — the
 * edge function already retried twice — it is replaced by the rules-based plan
 * and the rejection is recorded. The user sees a complete plan either way;
 * there is no error state for this path.
 */
export async function producePlan({ repo, profile, weekIndex, fromModel }: PlanRequest): Promise<PlanOutcome> {
  const template = buildTemplatePlan(profile, weekIndex)

  if (fromModel) {
    const candidate = await fromModel(profile, weekIndex).catch(() => null)
    if (candidate) {
      const result = gate(candidate, profile)
      if (result.verdict === 'BLOCK_ACCOUNT') {
        await record(repo, result, 'model', 1)
        return { plan: null, verdict: result.verdict, substitutions: [], fellBack: false }
      }
      if (result.verdict === 'PASS' || result.verdict === 'OFFER_ALTERNATIVE') {
        await repo.savePlan(result.plan)
        return {
          plan: result.plan,
          verdict: result.verdict,
          substitutions: result.substitutions,
          fellBack: false,
        }
      }
      await record(repo, result, 'model', 1)
    }
  }

  // The template is gated too. It is not trusted just because we wrote it.
  const fallback = gate(template, profile)
  if (fallback.verdict === 'BLOCK_ACCOUNT') {
    await record(repo, fallback, 'template', 1)
    return { plan: null, verdict: fallback.verdict, substitutions: [], fellBack: true }
  }
  if (fallback.verdict !== 'PASS' && fallback.verdict !== 'OFFER_ALTERNATIVE') {
    await record(repo, fallback, 'template', 1)
    return { plan: null, verdict: fallback.verdict, substitutions: [], fellBack: true }
  }

  await repo.savePlan(fallback.plan)
  return {
    plan: fallback.plan,
    verdict: fallback.verdict,
    substitutions: fallback.substitutions,
    fellBack: fromModel !== undefined,
  }
}
