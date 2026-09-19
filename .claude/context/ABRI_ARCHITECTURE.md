# ABRI — Architecture & Product Technical Specification

## 1. Project Overview

**ABRI (AI Bubble Risk Index)** is a web platform that publishes a daily **0–100 AI Bubble Risk Index** based on fresh AI-market signals and news.

The product combines:

1. Daily ABRI score
2. Explanation of the factors affecting the score
3. External AI-related news with ABRI's own impact/explanation
4. Historical ABRI score data
5. Weekly newsletter
6. User prediction of **when the AI bubble will pop**
7. A generated vintage-style prediction declaration/card
8. A static methodology and disclaimer page

The system must be designed so that the daily scoring pipeline can later support automated social posting to **X and Reddit**.

---

# 2. Current Scope

## Pages

### `/`
Index homepage.

Contains:

- Current ABRI score
- Score status
- Daily score movement
- Short explanation
- ABRI mascot
- `See what moved it →` CTA
- Historical ABRI graph
- Four factor/signal blocks
- Factors link to the methodology page
- Prediction CTA
- Short methodology/about section

### `/news`
News page.

Contains:

- Weekly newsletter signup card
- All relevant daily news items on one page
- External article information
- Source/publisher
- Date/time
- ABRI impact
- Toggle to show/hide ABRI explanation

ABRI must not reproduce external articles. It stores and displays appropriate metadata and links users to the original source.

### `/predict`
Prediction page.

Users:

1. Enter their name
2. Choose a quarter
3. Choose a year
4. Submit their prediction for when the AI bubble will pop
5. Receive a generated vintage declaration/card
6. Share it through:
   - X
   - LinkedIn

The declaration should be rendered from an HTML/CSS template so the user's name, prediction and date can be dynamically inserted.

### `/methodology`
Static methodology page.

Contains:

- What ABRI measures
- What signals are considered
- How the score is calculated
- Explanation of the mathematical model
- Data/news methodology
- Limitations
- Disclaimer

**The exact methodology and mathematical equation are not finalized yet.**

---

# 3. Product Architecture

High-level architecture:

```text
                    ┌─────────────────────┐
                    │   External Sources  │
                    │ News / Market Data  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ News Retrieval Layer│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  AI Analysis Layer  │
                    │ relevance / signals │
                    │ explanation / score │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   ABRI Score Engine │
                    │     0–100 daily     │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴──────────────┐
                 ▼                            ▼
       ┌──────────────────┐          ┌──────────────────┐
       │ Database / Cache │          │ Public Frontend  │
       └──────────────────┘          └──────────────────┘
                                              │
                        ┌─────────────────────┼────────────────────┐
                        ▼                     ▼                    ▼
                      Index                  News                Predict
                                              │
                                              ▼
                                      Weekly Newsletter

Future:

Database / Score
       │
       ▼
Social Posting Agent
       ├── X
       └── Reddit
```

---

# 4. Technology Direction

Use a framework suitable for:

- Excellent SEO
- Server-side rendering / static generation
- Fast initial page loads
- Responsive UI
- Easy deployment
- Strong React ecosystem
- Easy integration with API/backend services

### Recommended direction

**Next.js + TypeScript** is the preferred frontend/full-stack framework unless a different architecture is chosen later.

The implementation should favor:

- Server-rendered/indexable content where useful
- Static generation for historical/public pages where possible
- Dynamic rendering only where required
- API routes/server actions only where appropriate

### Backend

**TO BE DETERMINED**

The architecture must keep the scoring/news pipeline separable from the frontend so the backend technology can be changed without rewriting the UI.

### Database

Use a relational database.

**Preferred direction: PostgreSQL**

Final provider:

**TO BE DETERMINED**

---

# 5. SEO Requirements

SEO is a core architectural requirement, not something added at the end.

The site must be built around indexable, useful, original ABRI content.

## Technical SEO

Implement:

- Server-side rendering / static generation where appropriate
- Semantic HTML
- Proper heading hierarchy
- Unique `<title>` and meta description per indexable page
- Canonical URLs
- Open Graph metadata
- Twitter/X card metadata
- XML sitemap
- `robots.txt`
- Structured data/schema markup where appropriate
- Fast Core Web Vitals
- Mobile-first responsive design
- Clean, descriptive URLs
- Internal linking
- Image optimization
- Proper alt text
- No important SEO content hidden behind client-only rendering

## SEO Content Structure

Important indexable pages should include:

- `/`
- `/news`
- `/methodology`
- Historical score pages if implemented
- Other data-driven pages that provide genuine value

Potential future route:

`/index/[date]`

Each historical daily page can contain:

- ABRI score for that date
- Score movement
- Main factors
- Relevant news references
- Historical context

Do not mass-generate low-value AI pages.

ABRI's original value should come from:

- Its index
- Historical data
- Methodology
- Original analysis
- Data visualizations

---

# 6. ABRI Daily Update Pipeline

The ABRI score is updated **once per day**.

The exact update time and timezone:

**TO BE DETERMINED**

The system should nevertheless be timezone-aware.

Future social posting requirements:

- X/Reddit posting agent runs based on the daily score update
- Posting time should be configurable in **US time zones**
- Do not hardcode a timezone into the architecture

Example configuration concept:

```text
score_update_timezone = TO_BE_DETERMINED
social_post_timezone = TO_BE_DETERMINED
```

---

# 7. AI Architecture

The AI is primarily used in the daily news/scoring pipeline.

Because the system runs approximately once per day, quality/reasoning capability is prioritized over minimizing per-request inference cost.

## Model

Decided in [`ABRI_NEWS_RETRIEVAL_TECHNICAL_BLUEPRINT.md`](./ABRI_NEWS_RETRIEVAL_TECHNICAL_BLUEPRINT.md)
§13: a two-model split rather than a single frontier call — **GPT-5.6
Luna** for cheap, high-volume per-article extraction, and **GPT-5.6 Sol**
for the single high-value daily reasoning pass. Provider: OpenAI. Exact
prompts and fallback-model behavior are still open (that document's §28).

The implementation must isolate the model behind an internal service/interface so the model can be replaced without changing the rest of the system.

Conceptual interface (now split into two, per the blueprint's §22):

```text
extract(article)          →  ArticleExtraction     (Luna, per article)
interpret(evidencePackage) →  AI analysis result    (Sol, once/day)
        ↓
ABRI scoring engine
```

The system should make the minimum number of expensive model calls necessary while preserving quality.

---

# 8. News Sources & Retrieval

News source strategy and retrieval mechanism are decided in
[`ABRI_NEWS_RETRIEVAL_TECHNICAL_BLUEPRINT.md`](./ABRI_NEWS_RETRIEVAL_TECHNICAL_BLUEPRINT.md)
§3-§6: **RSS-only for MVP** (no search API, no aggregator) — 15–20 curated
feeds across official company/research sources (OpenAI, Google DeepMind,
Google Research, Microsoft Research, NVIDIA) and tech press (TechCrunch,
The Verge, Ars Technica, WIRED, VentureBeat, MIT News). Exact feed URLs,
source weighting, and retrieval schedule are still open (that document's
§28).

Potential architecture requirements:

- Retrieve fresh articles/signals
- Deduplicate articles
- Identify relevant AI-market events
- Store source metadata
- Preserve original article URLs
- Track publication time
- Avoid storing/reproducing copyrighted article text unnecessarily
- Allow source-level attribution
- Make source integrations replaceable

Possible source categories:

- Financial news
- Technology news
- AI-specific publications
- Company announcements
- Funding announcements
- Public filings
- Other primary sources

Source list and retrieval technology are decided (see above) — remaining details (exact feed URLs, weighting, schedule) must still be resolved before implementation of the production pipeline.

---

# 9. ABRI Scoring Engine

The score must produce a value:

```text
0–100
```

The score should primarily react to:

- Fresh news
- Current trends
- Funding activity
- Valuations
- Infrastructure/compute spending
- Market signals
- Other relevant bubble indicators

The mathematical equation and weighting system are specified in
[`ABRI_SCORING_METHODOLOGY.md`](./ABRI_SCORING_METHODOLOGY.md): a hybrid
model (AI classifies/scores individual signals, a deterministic weighted
formula computes the final number) over 5 factors — Funding (25%),
Valuations (25%), Sentiment (20%), Infrastructure (20%), and Correction
Signals (a subtracted penalty, not a positive addend).

That document is a **draft** — the overall approach and factor weights are
decided, but several constants and mechanisms (per-factor normalization
rubrics, decay curve interpolation, the correction-penalty weight, status
band thresholds, and others) are explicitly still open. See its §8 before
implementing anything.

The scoring engine should be isolated as its own module:

```text
/scoring
    ├── inputs
    ├── normalization
    ├── weighting
    ├── calculation
    └── validation
```

The final methodology must be deterministic/reproducible from the stored inputs.

Every daily score should retain enough information to explain:

> Why did ABRI become X today?

---

# 10. Database Model

Conceptual schema:

## `daily_scores`

Stores one ABRI score per day.

Fields:

```text
id
date
score
previous_score
change
status
summary
created_at
updated_at
```

`status` examples:

```text
COLD
WARM
ELEVATED
HOT
VERY_HOT
```

Final thresholds:

**TO BE DETERMINED**

---

## `score_factors`

Stores the components behind a daily score.

```text
id
daily_score_id
name
impact
description
category
created_at
```

Examples:

```text
AI funding activity
Rising valuations
Infrastructure spending
Correction signals
```

The final factor system is:

**TO BE DETERMINED**

---

## `news_articles`

Stores external article metadata.

```text
id
source
title
url
published_at
retrieved_at
category
external_id
deduplication_hash
created_at
```

Do not use ABRI to reproduce full external articles.

---

## `news_impacts`

Connects articles to ABRI scoring.

```text
id
news_article_id
daily_score_id
impact
explanation
relevance_score
created_at
```

---

## `predictions`

Stores user predictions.

```text
id
name
predicted_quarter
predicted_year
created_at
```

No account system is required for the current MVP.

---

## `newsletter_subscribers`

```text
id
email
status
subscribed_at
unsubscribed_at
```

The newsletter provider:

**TO BE DETERMINED**

The application should not tightly couple the entire system to a specific email provider.

---

# 11. Newsletter

The newsletter is **weekly**, not daily.

Purpose:

> Summarize the most important AI bubble developments from the week.

The newsletter should use stored ABRI data/news rather than requiring a separate manual data collection workflow.

Potential weekly content:

- Current ABRI score
- Weekly score movement
- Biggest signals
- Important news
- Notable changes
- Short ABRI interpretation

Exact newsletter provider, sending day/time and generation workflow:

**TO BE DETERMINED**

---

# 12. Prediction Declaration

The prediction result should be generated from a fixed HTML/CSS template.

User-provided variables:

```text
name
predicted_quarter
predicted_year
declaration_date
```

The visual style:

- Vintage statement/document
- Coffee-brown palette
- Aged paper appearance
- Serif typography
- Formal/high-level English
- ABRI branding
- Pixel mascot

The generated declaration must remain deterministic and visually consistent.

Avoid using an image-generation model for the declaration itself.

---

# 13. Sharing

Prediction cards should support:

- X
- LinkedIn

The system should generate a shareable URL and/or rendered image representation of the declaration.

Exact image-rendering implementation:

**TO BE DETERMINED**

The share flow should not require a user account for the MVP.

---

# 14. Responsive Design

The frontend must be designed mobile-first.

Requirements:

- Desktop
- Tablet
- Mobile

The homepage must preserve the visual hierarchy:

1. ABRI score
2. Status/change
3. Explanation
4. Mascot
5. Prediction CTA
6. Historical graph
7. Methodology/factors

The four factor blocks should stack or use a responsive grid on smaller screens.

The News page must keep all daily relevant articles accessible on one page while remaining usable on mobile.

The prediction declaration must be responsive and also render correctly as a fixed shareable card.

---

# 15. Dockerization

The application must be Dockerized.

Requirements:

- Production Dockerfile
- `.dockerignore`
- Environment variable configuration
- Reproducible production build
- Non-root container where practical
- Small production image
- Separate build/runtime stages if appropriate

Example structure:

```text
Dockerfile
.dockerignore
docker-compose.yml       # if needed for local development
.env.example
```

The application must run successfully inside Docker.

---

# 16. Configuration & Environment Variables

Secrets and provider configuration must never be hardcoded.

Expected categories:

```text
DATABASE_URL

AI_PROVIDER_API_KEY

NEWS_PROVIDER_API_KEY

NEWSLETTER_PROVIDER_API_KEY

APP_URL

SCORE_UPDATE_TIME
SCORE_UPDATE_TIMEZONE

SOCIAL_POST_TIME
SOCIAL_POST_TIMEZONE
```

Exact variable names/providers may change when the TBD decisions are finalized.

---

# 17. Future Social Posting Agent

Not part of the initial implementation.

Future system:

```text
Daily ABRI score finalized
        ↓
Social Posting Agent
        ↓
Generate post
        ↓
X
Reddit
```

The architecture should make it possible to add this without changing the core scoring system.

The agent will eventually post:

- Daily ABRI score
- Score movement
- Short explanation
- Relevant signals
- Link to ABRI

Posting schedule will use a configurable **US timezone**.

---

# 18. Reliability & Data Integrity

The daily pipeline should be safe to rerun.

Requirements:

- Idempotent daily score generation
- News deduplication
- Unique daily score per date
- Store raw inputs/analysis required to reproduce the score
- Logging for pipeline failures
- Clear pipeline status
- Do not overwrite historical scores silently

If the daily pipeline fails, the system should make the failure visible to administrators and allow a controlled retry.

---

# 19. Separation of Concerns

Recommended logical modules:

```text
src/
├── app/
│   ├── page
│   ├── news/
│   ├── predict/
│   └── methodology/
│
├── components/
│   ├── index/
│   ├── news/
│   ├── prediction/
│   ├── mascot/
│   └── shared/
│
├── lib/
│   ├── db/
│   ├── ai/
│   ├── news/
│   ├── scoring/
│   ├── newsletter/
│   └── sharing/
│
└── jobs/
    └── daily-abri-update/
```

Exact project structure may be adapted to the selected framework.

---

# 20. Implementation Priorities

## Phase 1 — Foundation

- Project setup
- Framework setup
- TypeScript
- Database connection
- Docker
- Environment configuration
- Responsive design system

## Phase 2 — Static UI

- Index page
- News page
- Prediction page
- Methodology page
- Responsive implementation
- Pixel mascot
- Vintage declaration template

## Phase 3 — Data Layer

- Database schema
- Daily scores
- Factors
- News articles
- News impacts
- Predictions
- Newsletter subscribers

## Phase 4 — Daily AI Pipeline

- News retrieval
- Deduplication
- AI analysis
- Signal extraction
- ABRI calculation
- Score persistence
- Daily update

## Phase 5 — Newsletter

- Subscription flow
- Weekly aggregation
- Newsletter generation
- Sending workflow

## Phase 6 — Sharing

- Declaration rendering
- X sharing
- LinkedIn sharing

## Phase 7 — Production

- SEO
- Sitemap
- Metadata
- Structured data
- Performance optimization
- Docker production build
- Monitoring/logging
- Deployment

## Phase 8 — Future

- X posting agent
- Reddit posting agent
- Automated daily social distribution

---

# 21. Decisions Still To Be Determined

Do not make final assumptions about these until explicitly decided:

### ABRI methodology

Decided in principle — see [`ABRI_SCORING_METHODOLOGY.md`](./ABRI_SCORING_METHODOLOGY.md):

- ~~Mathematical equation~~ — hybrid model, weighted-factor core (§1, §3)
- ~~Factor weights~~ — 5 factors, weights assigned (§2)

Still open (see that document's §8 for the full list):

- Score thresholds (status bands) — proposed, not confirmed
- Per-factor normalization rubrics — not specified
- Treatment of conflicting signals
- Historical baseline mechanics (day-1 bootstrap, missing/sparse data days)
- Correction-penalty weight (two options proposed, unpicked)
- Decay curve interpolation and event-persistence classification

### AI

Decided — see `ABRI_NEWS_RETRIEVAL_TECHNICAL_BLUEPRINT.md` §13: GPT-5.6
Luna (extraction) + GPT-5.6 Sol (interpretation), OpenAI. Still open:
- Prompt architecture (both models)
- Structured output format (field-level detail)
- Fallback model

### News

Decided — see `ABRI_NEWS_RETRIEVAL_TECHNICAL_BLUEPRINT.md` §3/§6:
RSS-only, 15–20 curated feeds, 5-tier source classification. Still open:
- Exact RSS feed URLs
- Retrieval frequency (example schedule only)
- Number of articles processed (approximate funnel only)
- Deduplication/event-clustering algorithm
- Source weighting (tier → numeric weight mapping)

### Infrastructure

- Database provider
- Hosting provider
- Cron/scheduler
- Cache strategy
- Monitoring provider

### Newsletter

- Provider
- Sending day/time
- Email template
- Subscription/unsubscribe workflow
- Weekly generation workflow

### Social

- X API/provider
- Reddit API/provider
- Posting content format
- US timezone
- Posting time

These decisions should be added to this document once finalized rather than guessed during implementation.

---

# 22. Definition of Done — Initial Production Version

The project is ready for launch when:

- [ ] Index page matches the approved UI
- [ ] News page displays all relevant daily articles on one page
- [ ] External article links work
- [ ] ABRI impact explanations can be toggled
- [ ] Weekly newsletter signup works
- [ ] Prediction flow works
- [ ] Quarter/year prediction can be selected
- [ ] Vintage declaration is generated dynamically
- [ ] X and LinkedIn sharing works
- [ ] Methodology page exists
- [ ] Disclaimer is visible
- [ ] Daily score can be generated and stored
- [ ] Historical graph uses real stored data
- [ ] SEO metadata is implemented
- [ ] Sitemap and robots.txt are implemented
- [ ] Mobile/tablet/desktop layouts work
- [ ] Application runs in Docker
- [ ] Environment variables are documented
- [ ] Historical score data cannot be accidentally overwritten
- [ ] Daily pipeline can be safely retried
- [ ] No final TBD decision has been silently invented

---

# 23. Important Development Rule

**Do not invent unresolved product decisions.**

Whenever implementation reaches a section marked:

> **TO BE DETERMINED**

stop and surface the decision before building production logic around it.

The architecture should be flexible enough that these decisions can be inserted later without requiring a major rewrite.
