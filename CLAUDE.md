# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Peak Fitness ("فِت"): an Expo app, web first, with the same code targeting iOS and Android. Expo Router, React Native + react-native-web, TypeScript strict (with `noUncheckedIndexedAccess`), TanStack Query + Zustand, Supabase. The product is a plan that changes with the user, through three loops:

1. **Daily check-in** (~10 s) → today's session adjusted, plus one sentence saying why (`app/(tabs)/today.tsx`, `lib/plan/adapt.ts`).
2. **Weekly review** (~2 min) → next week's plan, with "what happened / what changed / what's new" cards (`app/review.tsx`, `lib/plan/weekly.ts`).
3. **Phase review** (every 6–8 weeks) → keep the goal or change it, plus a shareable report (`app/phase.tsx`, `lib/plan/phase.ts`).

The owner's project guide is binding (see the last section). **A feature that serves none of the three loops is not built.**

## Commands

```bash
npm run web                                  # dev server (web)
npm test                                     # regenerates the Deno copy of lib/ (below), then vitest run
npx vitest run tests/plan/weekly.test.ts     # one file
npx vitest run -t "counts two days"          # one test, by name
npx vitest run --coverage                    # lib/safety must stay at 100% statements/functions/lines, 95% branches
npm run typecheck                            # tsc --noEmit
npm run build:web                            # expo export --platform web → dist/
npm run pack:single                          # dist/ → one self-contained HTML file, for hosted previews
```

There is no lint script. Running vitest directly skips the edge sync, and `tests/edge-sync.test.ts` then fails if a synced file changed: run `npm run sync:edge` (or `npm test`) and commit the regenerated files.

`EXPO_PUBLIC_*` values (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_REGION`, `POLICY_VERSION`, `FOOD_DB_URL`) reach a web build only when it is exported with `--clear`, because Metro caches the bundle across env changes. Without Supabase credentials the app runs entirely on browser storage — silently, which looks like a failed connection.

## Architecture

**Plans.** `producePlan` in `lib/plan/generate.ts` is the only path by which a plan reaches a screen. It asks the `generate-plan` edge function and falls back to the rules engine (`lib/plan/engine.ts`); either way the plan passes through the safety gate, and a plan that fails the gate is never persisted. The rules engine pre-filters blocked movement patterns and allergens itself, so gate substitutions (`substitutedFor` on an exercise) only happen on model-built plans.

**Safety gate** (`lib/safety/`) is the most important code in the repo; keep it at 100% coverage.
- `gate.ts`: under-18 (`MIN_AGE`) is checked before every other rule — deliberately unlike the guide's pseudocode — so a minor is never reported as a lesser rejection. Then calorie floors (`KCAL_FLOOR`: f 1200, m 1500), a 25% maximum deficit, 1%/week maximum loss, an allergen scan over every dish name (Arabic and English) and ingredient, and injury substitution.
- `allergens.ts`: nine groups, each with `direct`, `derivative` and `crossContact` terms plus `exceptions`; the derivative map is data, not scattered conditions. An exception masks only its own span rather than clearing the group: "طحينة" never matches gluten's "طحين", yet "جوز الهند واللوز" still flags the almond.
- `text.ts`: Arabic normalisation and a boundary-anchored matcher (clitics و ف ب ل ك + ال, a closed suffix set). Substring matching is wrong here — "لبن" sits inside "لبناني".
- `patterns.ts`, `substitute.ts`: an injury blocks whole movement patterns (a pattern → injury map, so the user is told why); substitution is deterministic by primary-muscle overlap and drops the slot rather than train the wrong muscle.
- `tests/nutrition/dishes-gate.test.ts` holds each dish's hand-written `contains` list to what the gate finds in that dish.

**Reviews and charts.** Each review's reported change is derived from the line it decides on: `weeklyLine` (least-squares fit over the last 14 weigh-ins) and `phaseLine` (mean of the first window → mean of the last, over 60). The review queries return the readings they computed from (`WithReadings` in `lib/data/queries.ts`), and `components/TrendChart.tsx` draws the line over exactly those — never a second fetch, never a fit of its own. Adding a weight resets both cached reviews (reset, not invalidate: an invalidated review stays on screen, Apply live, while it refetches), and the weekly review computes only after the weight entered on its first step is saved.

**Data.** `lib/data/repo.ts` is the interface; `local.ts` (browser storage, keys prefixed `peak:`) and `supabase.ts` are the drivers, chosen once by `isSupabaseConfigured()`. Screens use the TanStack hooks in `lib/data/queries.ts`. The Supabase driver persists its session through `expo-secure-store`, never AsyncStorage.

**Edge functions** (`supabase/functions/generate-plan`, `analyze-meal`) hold the only model key and enforce per-user quotas through the `consume_quota` RPC (`_shared/http.ts`). Deno needs `.ts` import extensions, so `scripts/sync-edge-safety.mjs` *generates* `supabase/functions/_shared/lib/` from the files in its `SOURCES` list. Never edit that copy; edit `lib/`.

**Schema** lives in `supabase/migrations/0001_init.sql`, and `tests/schema.test.ts` pins its rules: RLS on every table with its policies in the same migration, `WITH CHECK` on updates, and `delete_all_my_data()` deleting from every table. `revoke ... from public` on a function also removes the grant `service_role` inherits — grant it back explicitly.

**What the model sees** is built by copying keys *out* through the allowlist in `lib/privacy/modelSafe.ts`, so a new column cannot leak by default. The privacy screen renders the same list.

**Onboarding draft** (`lib/store/onboarding.ts`) lives in memory only. Editing a profile must `hydrate(profile)` first, or saving writes the defaults — allergies included — over the real values. Injuries and allergies track `answered`: an empty list is not an answer.

**Vitest cannot import `react-native`** (Flow syntax). Logic that needs tests lives in `lib/` without RN imports (`lib/plan/session.ts` and `lib/auth/credentials.ts` exist for that reason). `lib/design/tokens.ts` must stay RN-free because the contrast test imports it; platform-dependent typography goes in `lib/design/typography.ts`.

## UI and design system

`design-system/fit/MASTER.md` records the design decisions, including which ui-ux-pro-max and dataviz recommendations were rejected and why. Values live in `lib/design/tokens.ts` (two themes); screens get colour from `useTheme()` / `makeStyles()` in `lib/design/theme.ts` and are built from `components/ui.tsx`. No hex values, `left`/`right`, or `fontWeight` in screens.

- `tests/contrast.test.ts` asserts every colour pairing a component draws, in both themes. When a component starts drawing a new pairing, add it there first.
- Fonts are self-hosted in `assets/fonts/` (Noto Kufi Arabic 700, Noto Sans Arabic 400/700), and each family name is a single weight file: never combine them with `fontWeight`. Never put `letterSpacing` or `textTransform` on localised text.
- Accessibility state goes in `aria-*` props (`aria-checked`, `aria-disabled`, `aria-valuenow`, `aria-hidden`): react-native-web 0.21 ignores `accessibilityState`, `accessibilityValue` and the native-only hiding props.
- react-native-web resolves logical inset props (`start`/`end` on absolutely positioned views) to a physical side at build time, so `components/TabIcon.tsx` takes the side from the locale. SVG text uses `textAnchor="middle"`, because `start`/`end` follow the text direction.

## Language

Arabic is the first language, not a translation. All copy lives in `locales/ar.json` and `locales/en.json`; `tests/i18n.test.ts` enforces identical keys and placeholders and **Western digits (0–9) everywhere**. Layout uses logical properties so it mirrors. A leading minus or an en dash reorders inside Arabic text: `translate()` isolates numeric ranges in Arabic copy automatically, and values built in code go through `ltr()` from `lib/i18n` (`formatRange` already does). Arabic counts are not "N + plural": one and two have their own forms («يوم واحد», «يومين»). The voice is a warm Gulf coach: one sentence, not a list.

## The owner's rules

Safety and privacy, without exception:
- No model API key in the app. Every model call goes through a Supabase Edge Function, with per-user quotas and rate limits enforced server-side.
- RLS on every table holding user data; a new table ships with its policies in the same migration.
- Meal photos are never stored: analyse, extract the values, delete. No persistent bucket.
- No identity goes to the model — no name, email, user_id or phone number. Only age, weight, height, sex, goal, dietary restrictions, allergies and injuries.
- No health data in logs, crash reports or analytics events; a log record carries `user_id` and `event_type` only.
- The biometric/passcode lock locks the app on this device only. Never claim in the UI that it protects the data.
- Plans reaching a user that contain an allergen: the target is absolute zero. Users under 18 are blocked.

Meal estimates: always a range, never a single number, with the fat range wider (oil does not show in a photo); ask the two one-tap questions (how it was cooked, how big); never call an estimate "accurate"; barcode and nutrition-label logging use no vision model; a dish is remembered after `CORRECTIONS_BEFORE_MEMORY` (3) corrections.

Not built: smartwatch sync, Ramadan mode, hydration tracking, community features, pregnancy/postpartum plans, any therapeutic claim.

Working style:
- **Before adding any library, state why and at least one alternative, and wait for approval.** (Fonts and icons were done without one on purpose.)
- Plan before multi-file changes; ask rather than guess.
- Small commits whose message explains why, not what. Comments explain decisions, not lines.
- No README or other docs nobody asked for.
- A PR touching safety or pricing logic states explicitly what was tested.

North-star metric: users who completed 4+ workouts in the last week.
