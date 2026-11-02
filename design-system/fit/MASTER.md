# Fit — Design System (Master)

Global source of truth. A page file in `pages/` overrides this one for that page only.
Values live in code (`lib/design/tokens.ts`); this file records the decisions behind them.

## Provenance

Generated with the ui-ux-pro-max skill, then checked against the product. Only verified matches were kept.

| Dimension | Skill result | Kept? | Why |
|---|---|---|---|
| Style | Minimalism & Swiss Style (light + dark, a11y risk: low) | **Kept** | One idea per screen; the coach's line is the hero, not the chrome. |
| Style (1st query) | Claymorphism | Rejected | Toy-like, "children's apps". Wrong for an adult coach; dark mode only "conditional". |
| Typography | Noto Sans Arabic + Noto Kufi Arabic | **Kept** | Verified `arabic` subset. Glyph check: Western digits, Latin, `tnum`, joining forms all present. |
| Typography (1st query) | Varela Round / Nunito Sans | Rejected | Neither font contains Arabic. |
| Palette | Lavender wellness / amber streak | Rejected | Generic. The Peak mark already defines the brand: lime on deep green, with sand. |
| Pattern | Hero + Testimonials / Product Demo | Not applicable | Landing-page patterns. This is an app's interior. |
| RTL guidance | No match in the database | — | Rules below come from the project guide and verified browser behaviour. |

## Principles

1. **One output per loop, one message per screen.** The daily check-in returns one adjusted session and one sentence. Nothing on the screen competes with that sentence.
2. **Hierarchy by size and weight, never by fading.** Two text tiers only. A third, fainter tier is how text falls below 4.5:1 — the previous theme's `textFaint` did, at 3.33:1.
3. **Numbers are typography.** Western digits (0–9) everywhere, tabular figures wherever a value changes in place.
4. **Flat.** No gradients, glass, or decorative shadow. Surfaces separate by a tonal step or a hairline.

## Colour

Semantic roles only; screens never name a hex value. Both themes define the same roles (enforced by test).

| Role | Dark | Light | Rule |
|---|---|---|---|
| `bg` / `surface` / `surfaceRaised` | `#0B140C` `#132015` `#1B2B1D` | `#F7F9F4` `#FFFFFF` `#EEF2EA` | |
| `text` / `textMuted` | `#F1F5EC` `#93A38D` | `#0B140C` `#4A5A46` | ≥ 4.5:1 on every surface |
| `line` | `#274129` | `#DCE4D6` | Decorative only — no contrast floor, carries no meaning |
| `lineStrong` | `#5A7F5C` | `#6E7C69` | A control's own edge — ≥ 3:1 |
| `primary` / `onPrimary` | lime / ink | deep green / white | |
| `accent` | `#B7E01E` | `#4F690D` | Lime **as text**. Pure lime on white is 1.53:1, so light mode uses an ink. |
| `accentFill` / `onAccentFill` | lime / ink | lime / ink | Lime **as a fill** — always with dark ink on it |
| `accentSoft` | `#1F2E12` | `#EFF6D8` | The coach card's ground |
| `focus` | lime | deep green | ≥ 3:1. Lime fails as a ring on white. |
| `ok` / `warn` / `danger` (+ `Soft`) | | | ≥ 4.5:1 on surface and on their own tint |

`tests/contrast.test.ts` asserts every pairing a component draws, in both themes. **When a component starts drawing a new pairing, add it there first.**

Theme follows the system by default; the user can pin light or dark in the profile.

## Typography

| Token | Family | Size / line | Use |
|---|---|---|---|
| `display` | Noto Kufi Arabic 700 | 32 / 50 | One per screen at most |
| `title` | Noto Kufi Arabic 700 | 24 / 38 | Screen title |
| `heading` | Noto Kufi Arabic 700 | 18 / 30 | Section |
| `lead` | Noto Sans Arabic 400 | 18 / 30 | The coach's one sentence — outranks body |
| `body` | Noto Sans Arabic 400 | 16 / 26 | Everything read as prose |
| `bodyStrong` | Noto Sans Arabic 700 | 16 / 26 | Emphasis, button labels |
| `label` | Noto Sans Arabic 700 | 14 / 22 | Field labels, chips |
| `caption` | Noto Sans Arabic 400 | 13 / 20 | Floor — nothing smaller |
| `numeral` / `numeralSmall` | Noto Sans Arabic 700, `tabular-nums` | 28 / 36 · 18 / 26 | Values that change in place |

- Base is 16 (the old body was 15). Line height ≈ 1.6: Arabic has tall ascenders and stacked marks; Kufi clips if set tighter.
- **Never set `fontWeight` with these families.** Each family name is one weight file; the browser would embolden bold again.
- **Never set `letterSpacing` or `textTransform` on localised text.** Arabic has no case, and tracking pulls a joined script apart. Tracking is allowed only on the Latin wordmark.
- Three files, 564 KB, SIL OFL 1.1 (`assets/fonts/OFL.txt`). Loaded by `expo-font`, already a dependency — no new library. Self-hosted rather than the Google Fonts CDN, so opening a health app does not report the user's IP to a third party. Zero-byte alternative if size ever matters more than consistency: the platform font (SF Arabic on iOS; Android already ships Noto Sans Arabic).

## Space, shape, touch

- Spacing: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`. Nothing is spaced outside the scale.
- Radius: `sm 8 · md 12 · lg 16 · pill`.
- Touch target ≥ 48 (clears iOS 44pt and Android 48dp with one number). Expand the hit area, not the glyph.
- Content column ≤ 560, gutter 16 (24 at ≥ 600 wide).

## Direction (RTL)

- Logical properties only (`start` / `end`, `marginStart`, `paddingEnd`). Never `left` / `right`.
- One known exception: react-native-web resolves logical *inset* properties to a physical side when the stylesheet is built, so an absolutely positioned element takes its side from the locale (see `components/TabIcon.tsx`).
- Signed values and units are wrapped in a bidi isolate (`ltr()`), or `-3.85 kg` renders as `3.85- kg` in Arabic.
- Directional icons (back, next, progress) mirror; non-directional ones (check, plus, clock) do not.

## Motion

Subtle (dial 3/10). `press 120ms · state 200ms · screen 280ms`; exits run at 70% of entry. Opacity and colour only — never animate layout bounds. With reduced motion on, state changes are immediate.

## Components

| Component | Contract |
|---|---|
| `Screen` | Safe areas, scroll, optional fixed footer; content never sits under the footer |
| `Button` | `primary` · `secondary` · `quiet` · `danger`. ≥ 48 high. Pressed = opacity, never a size change |
| `CoachLine` | The one sentence explaining today's change. The only `accentSoft` surface on a screen |
| `Choice` | Single/multi select row, announced as radio or checkbox. Boundary is `lineStrong`; selection is shown by fill *and* a check mark, not colour alone |
| `Segmented` | 2–4 short exclusive options on one line (language, theme, cook method) |
| `Pill` | Compact single choice among many short options (dish quick-picks); 44 drawn, 48 touchable |
| `Stepper` | Labelled ± buttons around a tabular numeral; long-press repeats; the value is a polite live region |
| `Field` | Visible label above, hint below, error inline under the field — never placeholder-as-label |
| `Stat` | Numeral + unit + caption label |
| `Icon` | Hand-drawn SVG paths on `react-native-svg`; 1.75 stroke, 24 box; decorative icons hidden from the accessibility tree |

## Accessibility props

State goes in `aria-*` props — `aria-checked`, `aria-disabled`, `aria-busy`, `aria-valuenow`, `aria-hidden` — never `accessibilityState` / `accessibilityValue`. React Native accepts both on iOS and Android, but react-native-web 0.21 reads only `aria-*`: with `accessibilityState` every selected option reached a browser screen reader as unselected. Native-only hiding props (`accessibilityElementsHidden`, `importantForAccessibility`) do nothing on the web either; use `aria-hidden`.

A field's hint or error is tied to its input with `aria-describedby` (react-native-web drops `accessibilityHint`).

## Anti-patterns

- A third text tier, or any text below 4.5:1.
- Lime as text or as a focus ring in light mode.
- Emoji as icons.
- Raw exercise or allergen IDs reaching the screen — always resolve to the localised name.
- Eastern Arabic digits anywhere.
- A numeric range or signed value next to Arabic text without `ltr()` — an en dash or a leading minus reorders under RTL.
- "N + plural" Arabic counts: one and two have their own forms («يوم واحد», «يومين»).
- A placeholder standing in for a label, or one that looks like an entered value.
- `fontWeight` on a weight-specific family; `letterSpacing` / `textTransform` on Arabic.
