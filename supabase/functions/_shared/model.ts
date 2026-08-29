// The only place an Anthropic key exists. It is read from the function's
// environment and never leaves the server — a key shipped in the client is an
// open invoice within days.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.70.0'

// The allowlist lives in lib/privacy/modelSafe.ts and is generated into
// _shared by scripts/sync-edge-safety.mjs, so the app and the server cannot
// disagree about what a model is allowed to see.
export { MODEL_SAFE_KEYS, toModelSafe, type ModelSafeProfile } from './lib/privacy/modelSafe.ts'

export const MODEL = 'claude-opus-5'

export function anthropic(): Anthropic {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
  return new Anthropic({ apiKey })
}
