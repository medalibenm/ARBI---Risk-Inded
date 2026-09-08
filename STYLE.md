# ABRI Style & Theme Guide

Design system for the ABRI (AI Bubble Risk Index) site. Everything lives in
[`src/index.css`](src/index.css) as CSS custom properties consumed by
Tailwind CSS v4's `@theme inline` — there is no `tailwind.config.js`.

## Design philosophy

- **Flat, sharp, single-accent.** No rounded corners, no drop shadows, one
  accent color (red) used for every interactive/highlighted element. No
  orange/blue/green variety — if something needs to stand out, it's red.
- **Monospace everywhere.** One typeface (`Geist Mono`) for headings, body
  text, and numbers. No secondary display font.
- **Light/dark ready.** Every color is a semantic CSS variable with a light
  (`:root`) and dark (`.dark`) value, so a dark-mode toggle can be added
  later without touching component code.

## Color tokens

All colors are defined as OKLCH custom properties in `:root` (light) and
`.dark`, then re-exposed as Tailwind utilities via `@theme inline` — e.g.
`--background` → `bg-background`, `--card-foreground` → `text-card-foreground`.

| Token | Light | Role |
|---|---|---|
| `background` / `foreground` | near-white / near-black | Page background and default text |
| `card` / `card-foreground` | light gray / near-black | Card surfaces (score card, signal cards, about card, notification) |
| `muted` / `muted-foreground` | warm light gray / dark gray | Secondary text, icon-square backgrounds |
| `border` | soft warm gray | All hairline borders |
| `primary` | **red**, same value as `destructive` | Kept as an alias so any future `primary` usage stays on-theme |
| `destructive` | **red** — `oklch(0.577 0.245 27.325)` | The single accent: links, nav active state, badges, buttons, chart line, icons |
| `chart-1..5` | all set to the same red | Not used for multi-series variety here — kept red for consistency |
| `secondary`, `accent`, `popover`, `input`, `ring`, `sidebar-*` | defined for completeness (shadcn-style scaffold) | Mostly unused today; `ring` matches the red accent |

**Rule of thumb:** if you need a splash of color, reach for `destructive`
(`bg-destructive` / `text-destructive` / `border-destructive`). Don't
reintroduce `primary` as a visually distinct color — it's intentionally
aliased to red.

## Typography

- Single font stack: `--font-sans` / `--font-serif` / `--font-mono` all
  resolve to `Geist Mono, monospace` (loaded via Google Fonts in
  `index.html`).
- `body` sets `font-family: var(--font-mono)` directly — every component
  inherits it, no `font-*` utility classes are used anywhere.
- Headings/labels lean on `uppercase`, `tracking-wide`/`tracking-[0.3em]`,
  and `font-extrabold`/`font-bold` rather than a second typeface for
  hierarchy.

## Shape & elevation

- `--radius: 0rem` — every `rounded-*` utility used in components is
  `rounded-lg` (which resolves to `var(--radius)` = 0), so corners are
  square. `rounded-full` is still used, but only for true pills/circles
  (the "VERY HOT" badge, icon dots) — that's a shape choice, not a
  "softened corner."
- **No shadows.** All `--shadow-*` tokens are defined with `0.00` alpha, so
  the theme is flat by design. Don't add `shadow-lg` etc. expecting visible
  elevation — use a `border border-border` instead to separate surfaces.

## Motion

- One custom animation, `animate-nudge-x` (defined in `index.css`): a quick
  2px tick to the left and back, used on the floating prediction
  notification to draw a little attention without being a full bounce.
  Respects `prefers-reduced-motion`.

## Component patterns

- **Card**: `rounded-lg border border-border bg-card p-6`, text inside uses
  `text-card-foreground` / `text-muted-foreground`.
- **Primary button**: `rounded-lg bg-destructive px-4 py-2.5 text-destructive-foreground font-bold uppercase tracking-wide`.
- **Secondary button**: `rounded-lg border border-border bg-card text-card-foreground`.
- **Pill badge**: `rounded-full bg-destructive px-3 py-1 text-destructive-foreground uppercase`.
- **Icon square**: `h-11 w-11 rounded-lg bg-muted text-destructive` wrapping a
  small `currentColor` SVG (see `SignalIcon.jsx`).
- **Section label**: small `text-foreground` caps text flanked by two
  `text-destructive` `✦` marks (see `SectionHeading.jsx`).

## Where things live

- `src/index.css` — the entire theme (colors, radius, shadows, font, base
  layer, custom animation). This is the single source of truth; there is no
  JS theme config.
- Components consume only Tailwind utilities backed by these tokens
  (`bg-background`, `text-foreground`, `bg-destructive`, etc.) — no
  component defines its own colors or one-off hex values, except raw SVG
  paint attributes in `AbriChart.jsx`, which reference the CSS variables
  directly (`stroke="var(--destructive)"`) so the chart also follows the
  theme/dark-mode automatically.
