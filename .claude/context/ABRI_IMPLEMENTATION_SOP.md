# ABRI — Implementation SOP

Step-by-step build order for turning `ABRI_ARCHITECTURE.md`,
`ABRI_SCORING_METHODOLOGY.md`, and
`ABRI_NEWS_RETRIEVAL_TECHNICAL_BLUEPRINT.md` into a running product.

## How to read this

- 🔧 **Build** — code, no external action needed.
- 🔑 **Manual** — something only you can do (create an account, generate a
  key, click a button in a provider dashboard). Claude cannot do these.
- ⚠️ **Decision checkpoint** — a `TO BE DETERMINED` / "proposed, not
  confirmed" item from one of the three spec docs. Resolve it before
  building against it — don't let implementation silently pick a default.

Every ⚠️ below links back to the section that describes the options. None
of them block *starting* the project — they block the specific phase they're
listed under.

---

## Phase 0 — Accounts & manual setup

Do this first, once, so nothing mid-build stalls waiting on a login. This
is the consolidated answer to "when do I configure API keys/RSS sources
manually":

- 🔑 **OpenAI account + API key** — needed before Phase 6 (Luna/Sol). Set
  the spending cap in the OpenAI dashboard's billing/limits page **at
  account creation**, not after launch: alert threshold ~$20/mo, hard
  cap ~$30/mo, per `ABRI_NEWS_RETRIEVAL_TECHNICAL_BLUEPRINT.md` §24.
- 🔑 **RSS feed URLs** — needed before Phase 5. The blueprint (§3) names
  *publications*, not feed URLs, deliberately — feed paths drift. Before
  Phase 5, manually visit each of the 15–20 sources below and copy the
  live RSS/Atom URL:
  - TechCrunch, The Verge, Ars Technica, WIRED, VentureBeat
  - OpenAI News, Google DeepMind / Google AI, Google Research, MIT News
    (AI/CS), Microsoft Research
  - NVIDIA Press Room, NVIDIA Blog, NVIDIA Developer Blog, and any other
    major AI-company feed you decide to add

  Paste the confirmed URLs into the `news_sources` table (or a seed
  config file) — this document intentionally doesn't hard-code them.
- 🔑 **PostgreSQL provider account** — needed before Phase 4. ⚠️ Provider
  itself is undecided (`ABRI_ARCHITECTURE.md` §21 "Infrastructure";
  `...BLUEPRINT.md` §28) — pick one (e.g. Supabase, Neon, Railway, RDS)
  before this phase.
- 🔑 **Hosting provider account** — needed before Phase 11. ⚠️ Undecided,
  same sections as above.
- 🔑 **Domain/DNS** — if not already owned, needed before Phase 11.
- 🔑 **Newsletter provider account** — needed before Phase 9. ⚠️ Undecided
  (`ABRI_ARCHITECTURE.md` §11/§21) — e.g. Resend, Mailchimp, ConvertKit.
- Not needed yet: X/Reddit developer credentials — Phase 12, post-MVP.

---

## Phase 1 — Foundation

🔧
- Confirm current stack vs. target stack. The repo today is Vite + React
  (client-only SPA, JavaScript). `ABRI_ARCHITECTURE.md` §4 recommends
  Next.js for SSR/SEO. ⚠️ **Decision checkpoint:** decide *when* that
  migration happens — before building `/news`, `/predict`,
  `/methodology` (clean slate), or after (migrate the existing site).
  This SOP assumes the migration happens at the start of Phase 2; adjust
  if you'd rather ship the current SPA first and migrate later.
- Set up TypeScript if moving off plain JS (`ABRI_ARCHITECTURE.md` §20
  Phase 1).
- Docker: `Dockerfile`, `.dockerignore`, non-root user, build/runtime
  stages (`ABRI_ARCHITECTURE.md` §15).
- `.env.example` with the variable categories from `ABRI_ARCHITECTURE.md`
  §16 (`DATABASE_URL`, `AI_PROVIDER_API_KEY`, `NEWS_PROVIDER_API_KEY` →
  now specifically the OpenAI key, `NEWSLETTER_PROVIDER_API_KEY`,
  `APP_URL`, `SCORE_UPDATE_TIME`/`TIMEZONE`, `SOCIAL_POST_TIME`/`TIMEZONE`).
- Database connection wiring (no schema yet — that's Phase 4).

---

## Phase 2 — Routing & static UI

🔧
- Add routing for the four pages defined in `ABRI_ARCHITECTURE.md` §2:
  `/`, `/news`, `/predict`, `/methodology`.
- Migrate/rebuild the existing homepage sections (Hero, SignalsSection,
  ChartSection, AboutCard, Footer) into the new routed structure.
- Build `/news`, `/predict`, `/methodology` per the content spec in
  `ABRI_ARCHITECTURE.md` §2.
- Vintage prediction declaration template (`ABRI_ARCHITECTURE.md` §12) —
  static HTML/CSS template with variable slots for name/quarter/year/date.
- Confirm responsive behavior at all three breakpoints
  (`ABRI_ARCHITECTURE.md` §14).

---

## Phase 3 — SEO frontend changes

This is the concrete answer to "what frontend changes make it SEO
friendly." Two layers: fixes applicable to the site as it exists **now**
(single page, Vite SPA), and items that only make sense once Phase 2's
routing exists.

### Layer A — fixable immediately, no dependency on other phases

🔧
1. **Heading hierarchy is currently broken — there is no `<h1>` or `<h2>`
   anywhere on the page.** Confirmed by reading the current components:
   the "78" score, "AI BUBBLE RISK" label, and "WHY IS IT 78?" heading are
   all `<span>`/`<p>`, and the only semantic headings on the whole page are
   two `<h3>`s (`AboutCard.jsx`, `SignalsSection.jsx`). Fix:
   - `<h1>` — page title, once. Best candidate: wrap the "AI BUBBLE RISK"
     label or the "78" score block in Hero.
   - `<h2>` — section headings: "WHY IS IT 78?", "ABRI OVER THE PAST 30
     DAYS", "ABOUT ABRI" — currently rendered via `SectionHeading.jsx` as
     a `<p>`. Either change that component to render an `<h2>`, or wrap
     its content in one.
   - Keep the existing `<h3>`s as sub-headings under those `<h2>`s.
2. **`index.html` meta tags** — currently only has `<title>` and font
   preconnects. Add:
   ```html
   <meta name="description" content="ABRI is a daily 0–100 index measuring AI bubble risk from funding, valuations, sentiment, infrastructure spending, and market correction signals." />
   <link rel="canonical" href="https://<final-domain>/" />
   <meta property="og:type" content="website" />
   <meta property="og:title" content="ABRI — AI Bubble Risk Index" />
   <meta property="og:description" content="A daily 0–100 index measuring AI bubble risk." />
   <meta property="og:image" content="https://<final-domain>/og-image.png" />
   <meta property="og:url" content="https://<final-domain>/" />
   <meta name="twitter:card" content="summary_large_image" />
   <meta name="twitter:title" content="ABRI — AI Bubble Risk Index" />
   <meta name="twitter:description" content="A daily 0–100 index measuring AI bubble risk." />
   <meta name="twitter:image" content="https://<final-domain>/og-image.png" />
   ```
   ⚠️ Needs a real `og-image.png` (1200×630) and the final domain —
   placeholders above.
3. **`public/robots.txt`** (doesn't exist yet):
   ```text
   User-agent: *
   Allow: /
   Sitemap: https://<final-domain>/sitemap.xml
   ```
4. **`public/sitemap.xml`** — static single-URL version for now:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url><loc>https://<final-domain>/</loc></url>
   </urlset>
   ```
5. **JSON-LD structured data** — add a `WebSite`/`Organization` block to
   `index.html` or injected via a head-management library once routing
   exists.
6. **Image alt text** — already correct
   (`PixelMascot.jsx` has descriptive `alt` on both mascot images) — no
   change needed, noted so it isn't accidentally "fixed" into something
   worse.
7. **Image weight** — the mascot PNG is ~270KB in the current build
   output. Compress or convert to WebP with a PNG fallback before
   shipping publicly (`ABRI_ARCHITECTURE.md` §5 "Image optimization").

### Layer B — depends on Phase 2 routing (and, at full strength, on SSR)

🔧
- Per-page `<title>`/meta description for `/news`, `/predict`,
  `/methodology` (React Helmet if staying on Vite; Next.js Metadata API
  if migrating).
- Canonical URL per route.
- Sitemap grows to cover all four routes, plus (later) every
  `/index/[date]` historical page once that route exists
  (`ABRI_ARCHITECTURE.md` §5).
- Internal linking: factor cards on `/` should link to `/methodology`
  (already planned per `ABRI_ARCHITECTURE.md` §2, not yet built).
- ⚠️ **Decision checkpoint:** the real SEO ceiling for a client-only SPA is
  low regardless of the above — Google can crawl JS-rendered content but
  it's slower/less reliable than SSR. `ABRI_ARCHITECTURE.md` §4 already
  recommends Next.js for exactly this reason. If organic search is a
  priority for launch, treat the Phase 1 framework decision as the real
  SEO decision, not the meta-tag list above.

---

## Phase 4 — Database schema

🔧
- Provision the Postgres instance (🔑 Phase 0).
- Create tables from `ABRI_ARCHITECTURE.md` §10 and
  `...BLUEPRINT.md` §17: `daily_scores`, `score_factors`, `news_articles`,
  `news_impacts`, `predictions`, `newsletter_subscribers`,
  `news_sources`, `search_queries` (defined but unused for MVP),
  `article_extractions`, `events`, `event_articles`, `news_signals`,
  `daily_score_signals`.
- ⚠️ **Decision checkpoint:** `daily_scores.status` thresholds are only
  *proposed* (`ABRI_SCORING_METHODOLOGY.md` §6 — COLD/WARM/ELEVATED/HOT/
  VERY_HOT band cutoffs). Confirm before this data is queried against
  real bands.

---

## Phase 5 — News retrieval pipeline (RSS only)

🔧
- Seed `news_sources` with the confirmed feed URLs from Phase 0 and tiers
  from `...BLUEPRINT.md` §6.
- Build the RSS collector (`RssProvider` interface, §22).
- Normalize into the `NewsArticle` shape (§8).
- Dedup stages 1–2 (URL, title — §9).
- Rule-based relevance filter (§11).
- ⚠️ **Decision checkpoints before this phase is "done":** exact
  retrieval schedule/timezone (§7, `ABRI_ARCHITECTURE.md` §6), exact
  relevance-filter thresholds (§11).

---

## Phase 6 — AI pipeline (Luna + Sol)

🔧 (needs 🔑 OpenAI key from Phase 0)
- `ExtractionAIProvider` (Luna) — per-article structured extraction,
  writes to `article_extractions` (§13/§14/§17).
- Event clustering stage — Luna's structured output → `events` +
  `event_articles` (§9 stage 3, §10).
- `InterpretationAIProvider` (Sol) — one daily call over the clustered
  events, produces `news_signals` (§13/§14).
- ⚠️ **Decision checkpoints:** exact prompts for both models, field-level
  structured output schema, max evidence package size for Sol, fallback
  model if either is unavailable (`...BLUEPRINT.md` §28 "AI").

---

## Phase 7 — Scoring engine

🔧
- Implement `/lib/scoring` per `ABRI_SCORING_METHODOLOGY.md` §7's
  division of responsibility: normalization → weighting → calculation →
  validation.
- ⚠️ **Decision checkpoints — resolve every item in
  `ABRI_SCORING_METHODOLOGY.md` §8 before writing this code**, most
  importantly:
  - Correction-penalty weight (§3 — Option 1 vs. recommended Option 2)
  - Per-factor normalization rubric (§2/§5 — currently undefined for all
    5 factors)
  - Decay curve interpolation shape and event-persistence classification
    (§4)
  - `sensitivity` constant(s) and day-1 bootstrap value (§5)
  - Missing/sparse-data-day and conflicting-signal handling (§8)
  - Status band thresholds (§6 — also affects Phase 4's schema)

This phase is the one place in the whole project where building ahead of
a decision is most likely to require a rewrite later — it's worth pausing
here specifically.

---

## Phase 8 — Daily pipeline orchestration & reliability

🔧
- Wire Phases 5–7 into the single daily job
  (`...BLUEPRINT.md` §18's numbered steps).
- Idempotency: safe to rerun, never silently overwrite a stored score
  (`ABRI_ARCHITECTURE.md` §18).
- Failure handling: AI call failure → keep previous public score, mark
  run failed, allow controlled retry (`...BLUEPRINT.md` §23).
- Observability fields per `...BLUEPRINT.md` §25 (includes Luna/Sol
  call counts and cost estimates — feeds Phase 11's spend monitoring).
- 🔑 Configure the cron/scheduler (provider TBD, §0/§21) once hosting is
  chosen.
- ⚠️ **Decision checkpoint:** final score-update time and timezone
  (`ABRI_ARCHITECTURE.md` §6, `...BLUEPRINT.md` §7 — example times only
  so far).

---

## Phase 9 — Newsletter

🔧 (needs 🔑 newsletter provider account from Phase 0)
- Subscription signup flow, `newsletter_subscribers` table (already in
  Phase 4).
- Weekly generation job consuming existing `daily_scores`/`news_signals`
  data — no independent research (`ABRI_ARCHITECTURE.md` §11).
- ⚠️ **Decision checkpoints:** provider, sending day/time, email
  template, unsubscribe workflow (`ABRI_ARCHITECTURE.md` §21).

---

## Phase 10 — Prediction & sharing

🔧
- `/predict` form (name, quarter, year) → `predictions` table.
- Render the vintage declaration template (built in Phase 2) with the
  submitted values.
- X and LinkedIn share flow.
- ⚠️ **Decision checkpoint:** exact image-rendering implementation for
  the shareable card (`ABRI_ARCHITECTURE.md` §13).

---

## Phase 11 — Production readiness

🔧 (needs 🔑 hosting + domain from Phase 0)
- Full SEO Layer B rollout (Phase 3).
- Sitemap generation covering historical `/index/[date]` pages if that
  route is built (`ABRI_ARCHITECTURE.md` §5).
- Docker production build, deploy.
- 🔑 **Set the OpenAI spending alert/hard cap** if not already done in
  Phase 0 — do not skip this; `...BLUEPRINT.md` §24 treats it as a
  deployment checklist item, not optional.
- Monitoring/logging provider (🔑 account, ⚠️ provider TBD).
- Run the full Definition of Done checklist in `ABRI_ARCHITECTURE.md`
  §22 before calling this launched.

---

## Phase 12 — Future: social posting agent

Not MVP. `ABRI_ARCHITECTURE.md` §17, `...BLUEPRINT.md` §21. Requires 🔑 X
and Reddit developer credentials, and ⚠️ posting timezone/schedule
decisions, when this phase is actually scheduled.

---

## Open-decision index

Every ⚠️ above, in one place, so nothing gets missed:

| Item | Where it's discussed | Phase it blocks |
|---|---|---|
| Correction-penalty weight | `ABRI_SCORING_METHODOLOGY.md` §3/§8 | 7 |
| Per-factor normalization rubric | `...METHODOLOGY.md` §5/§8 | 7 |
| Decay curve interpolation + event persistence | `...METHODOLOGY.md` §4/§8 | 7 |
| Sensitivity constants, day-1 bootstrap | `...METHODOLOGY.md` §5/§8 | 7 |
| Missing-data / conflicting-signal handling | `...METHODOLOGY.md` §8 | 7 |
| Status band thresholds | `...METHODOLOGY.md` §6 | 4, 7 |
| Exact RSS feed URLs | `...BLUEPRINT.md` §3 | 0, 5 |
| Source weighting formula | `...BLUEPRINT.md` §28 | 5 |
| Retrieval schedule/timezone | `...BLUEPRINT.md` §7 | 5, 8 |
| Event clustering algorithm | `...BLUEPRINT.md` §9/§28 | 6 |
| Luna/Sol prompts + schema detail | `...BLUEPRINT.md` §28 | 6 |
| Fallback model | `...BLUEPRINT.md` §28 | 6 |
| Database provider | `ABRI_ARCHITECTURE.md` §21 | 0, 4 |
| Hosting provider | `ABRI_ARCHITECTURE.md` §21 | 0, 11 |
| Cron/scheduler | `ABRI_ARCHITECTURE.md` §21 | 8 |
| Monitoring provider | `ABRI_ARCHITECTURE.md` §21 | 11 |
| Newsletter provider/schedule/template | `ABRI_ARCHITECTURE.md` §21 | 0, 9 |
| Declaration image-rendering implementation | `ABRI_ARCHITECTURE.md` §13 | 10 |
| Vite-SPA-vs-Next.js migration timing | this doc, Phase 1 | 1, 2, 3 |
| Score update time/timezone | `ABRI_ARCHITECTURE.md` §6 | 8 |

None of these are blockers to starting Phase 0/1 — they're checkpoints
that need an answer by the time their listed phase begins, not before.
