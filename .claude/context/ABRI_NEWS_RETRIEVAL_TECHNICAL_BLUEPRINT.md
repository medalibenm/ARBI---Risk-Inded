# ABRI — News Retrieval & AI Analysis Technical Blueprint

## Status

This document defines the technical architecture for ABRI's news ingestion and daily scoring pipeline.

**Final MVP architecture, decided:** RSS-only ingestion (no search API), a
two-tier AI model split — GPT-5.6 Luna for cheap high-volume extraction,
GPT-5.6 Sol for the single daily reasoning pass — and a fixed 15–20 feed
RSS source list (§3, §4, §6, §13). The following remain genuinely
unresolved:
- Final ABRI mathematical equation and weights (see `ABRI_SCORING_METHODOLOGY.md`
  for the current draft)
- Source weighting formula, exact retrieval schedule, event-clustering
  algorithm, AI output schema details (§28)

Do not invent these decisions during implementation.

## 1. Goal

Build a reliable daily pipeline that:
1. Discovers fresh AI-market news from a curated set of RSS feeds.
2. Normalizes and cheaply deduplicates articles (URL/title level).
3. Filters for relevance to ABRI before spending on any AI call.
4. Extracts structured evidence from each relevant article using a cheap,
   high-volume model (Luna).
5. Clusters Luna's structured output into underlying events.
6. Sends only the resulting event evidence to a single frontier reasoning
   call per day (Sol).
7. Receives structured factor-level signals from Sol.
8. Calculates the final ABRI score deterministically in application code.
9. Publishes the score and evidence to the website.
10. Makes the same data available to the weekly newsletter.
11. Leaves a clean interface for a future X/Reddit posting agent.

## 2. High-Level Architecture

```text
                    15–20 CURATED RSS FEEDS
                            │
                            ▼
                     RSS COLLECTOR
                ~200–500 raw articles/day
                            │
                            ▼
              RULE-BASED RELEVANCE FILTER
                cheap rules, no AI call yet
                            │
                            ▼
                  ~30–80 relevant articles
                            │
                            ▼
              FETCH ORIGINAL ARTICLE PAGES
                            │
                            ▼
                      LUNA (GPT-5.6)
              cheap structured evidence extraction
                            │
                            ▼
             EVENT DEDUPLICATION / CLUSTERING
                            │
                            ▼
                   ~10–30 unique events
                            │
                            ▼
                       SOL (GPT-5.6)
              interpret events → ABRI signals
                            │
                            ▼
                 ABRI SCORE ENGINE
                  deterministic math
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
       WEBSITE          NEWSLETTER       FUTURE SOCIAL
       Index/News          Weekly          X + Reddit
```

The important separation: **Luna extracts facts → Sol interprets → math
calculates the score.** AI never decides the final ABRI number (§15).

## 3. Retrieval Strategy

**Decided: RSS-only for MVP.** No search API, no news aggregator, no
separate primary-source scraping layer — the RSS list itself already
includes each company's official newsroom/blog feed where one exists, so
"primary sources" and "RSS feeds" are the same list, not two mechanisms.
We poll 15–20 publisher RSS feeds directly.

```text
Publisher RSS
     ↓
RSS collector
     ↓
Normalize
     ↓
Cheap URL/title deduplication (§9, stages 1–2)
     ↓
Rule-based relevance filter (§11)
     ↓
Database
```

Poll selected feeds every few hours (§7).

### RSS source list

15–20 feeds, prioritizing source diversity over sheer feed count.

**Tech / business news**
- TechCrunch
- The Verge
- Ars Technica
- WIRED
- VentureBeat

**AI / research**
- OpenAI News
- Google DeepMind / Google AI
- Google Research
- MIT News — AI / Computer Science
- Microsoft Research

**Infrastructure / companies**
- NVIDIA Press Room
- NVIDIA Blog
- NVIDIA Developer Blog
- Microsoft's relevant technology/AI feeds
- Other selected major AI-company primary feeds, where a usable RSS feed
  exists

Feed availability has been checked, not assumed: Ars Technica officially
publishes an all-news RSS feed
([arstechnica.com/rss-feeds](https://arstechnica.com/rss-feeds/)); NVIDIA
officially publishes RSS feeds for its press room, blog, and developer blog
([nvidia.com/en-us/about-nvidia/rss](https://www.nvidia.com/en-us/about-nvidia/rss/));
OpenAI, Google DeepMind, Microsoft Research, and NVIDIA feeds are also
documented as usable RSS sources in a community-maintained list
([github.com/Neetx/ai-research-radar/SOURCES.md](https://github.com/Neetx/ai-research-radar/blob/main/SOURCES.md)).
Exact feed URLs still need to be pulled and pinned at implementation time
rather than hard-coded from this document — publisher feed paths drift.

**Dropped from the earlier proposal:** Reuters, Bloomberg, Financial Times,
WSJ, CNBC, The Information, Axios Pro Rata, Semafor Tech, Sifted, Fortune
Term Sheet, Business Insider, Yahoo Finance. These were in the prior
proposal but are cut for MVP in favor of a smaller, RSS-verifiable list —
most financial wire services either don't offer a free public RSS feed or
gate one behind a paid tier, which conflicts with the "RSS-only, no
aggregator" decision. They remain a reasonable post-MVP addition if a
paid-feed or search-API budget opens up later.

## 4. Search API — decided against for MVP

**Decided: no search API, no news aggregator for MVP.** The earlier
proposal in this section (Tavily as primary, NewsData/Marketaux as
secondary) is superseded. RSS-only ingestion (§3) covers the MVP source
list without the added cost, complexity, and third dependency of a search
provider. The main reason this is workable: with a curated 15–20 feed list
across official company blogs and specialist tech press, the *discovery*
problem a search API would normally solve is already handled by the feeds
themselves — a search API mainly buys broader/opportunistic discovery,
which isn't needed until the curated RSS set proves insufficient.

The `NewsSearchProvider` interface is still worth keeping defined (even
unused) so a search API can be added later without restructuring the
pipeline:

```text
NewsSearchProvider
 ├── search()
 ├── get_sources()
 └── normalize_result()
```

If this gets revisited later, Tavily remains the strongest candidate — it
returns cleaned, LLM-ready results rather than raw wire output, which
would fit directly ahead of the Luna extraction step (§13).

## 5. Optional Broad Discovery (post-MVP)

A broad discovery source such as GDELT can be added later to find events missed by the curated RSS feeds — this is now the fallback path, since there's no search API layer to extend first. Not part of MVP.

Use it for **discovery**, not automatic trust.

```text
Broad discovery
     ↓
Candidate article
     ↓
ABRI relevance validation
```

GDELT also exposes continuously updated article discovery/RSS data, but duplicates should be filtered.

## 6. Source Tiers

Every source in the §3 RSS list gets a configurable tier, reflecting the
current 15–20 feed set (no financial wire services in MVP — see §3's
"dropped" note).

**Tier 1 — Primary (official company/research sources)**
- OpenAI News
- Google DeepMind / Google AI
- Google Research
- Microsoft Research
- NVIDIA Press Room
- NVIDIA Blog
- NVIDIA Developer Blog

These are the companies' own announcements — the highest-confidence source
for funding, infrastructure, and product events involving that company.

**Tier 2 — High-quality tech/AI journalism**
- MIT News — AI / Computer Science (university research reporting, not a
  company announcement, but comparable editorial rigor to Tier 1)
- WIRED
- Ars Technica
- The Verge

**Tier 3 — Specialist/broad tech publications**
- TechCrunch
- VentureBeat

**Tier 4 — General/aggregator sites**
None in the current MVP list — reserved for future additions (e.g. if a
search API or broader aggregator is added post-MVP per §5).

**Tier 5 — Social sentiment (not treated as news evidence)**
Not in the MVP RSS list at all. If Reddit/X listening is added later, it
should route into the **Sentiment factor only** and never count as an
event source with the same evidentiary weight as Tiers 1–3 or toward
event-confirmation in §9/§10.

Tier sets a `weight` used both as a tie-breaker in event clustering (§10 —
a Tier 1 confirmation of a Tier 2/3 report increases confidence) and as an
input the AI analysis step can see (Luna's per-article extraction and
Sol's `confidence` field, §14, should reflect source tier, not just
article count).

## 7. Retrieval Schedule

The score is calculated once per day, but retrieval happens several times.

Example:

```text
06:00 UTC → RSS poll
12:00 UTC → RSS poll
18:00 UTC → RSS poll
00:00 UTC → RSS poll
09:00 ET  → Luna extraction + Sol final daily analysis
```

These times are examples only.

The final score update time/timezone is **TO BE DETERMINED**.

All scheduling must be timezone-aware.

## 8. Normalized Article Object

```typescript
type NewsArticle = {
  id: string
  title: string
  url: string
  sourceName: string
  sourceDomain: string
  sourceTier: number
  author?: string
  publishedAt: Date
  discoveredAt: Date
  description?: string
  retrievalMethod: "rss" | "search" | "broad_discovery" // MVP only ever produces "rss"; the others are reserved for §4/§5's future additions
  queryId?: string
  externalId?: string
  canonicalUrl?: string
  deduplicationHash: string
}
```

The application must not depend on a provider's proprietary response format.

## 9. Deduplication

Two dedup passes, split across the Luna boundary — cheap/rule-based before
spending an extraction call, semantic after.

### Stage 1 — URL (pre-Luna)

Normalize protocol, trailing slash and tracking parameters. Runs on raw
RSS output, before the relevance filter (§11).

### Stage 2 — Title (pre-Luna)

Normalize case, punctuation and whitespace, then compare title similarity.
Also runs before Luna — the goal of stages 1–2 is to avoid ever sending an
obvious duplicate into a paid extraction call.

### Stage 3 — Event similarity (post-Luna)

Different articles can describe the same event, without being obvious URL/
title duplicates. This stage runs **after** Luna's structured extraction
(§13), clustering on Luna's normalized entities/event descriptions rather
than raw headline text — more accurate than title-similarity alone, and
it's the natural point to do it since Luna has already turned each article
into structured data.

```text
Ars Technica: "AI company raises $10B"           ─┐
VentureBeat:  "AI company secures massive funding" ─┼─→ Luna extraction → ONE underlying event
```

## 10. Event Model

Separate articles from events.

```text
EVENT
 ├── Article A
 ├── Article B
 ├── Article C
 └── Article D
```

This prevents multiple reports of one event from being counted as independent signals.

## 11. Relevance Filtering

Rule-based only — filter before any AI call, including Luna. This is the
step that turns raw RSS volume into something worth paying for extraction.

Check:
- AI relevance
- ABRI-factor relevance
- recency
- duplicate status (§9, stages 1–2)
- source validity
- meaningful event vs generic commentary

Conceptual reduction, matching §2's pipeline:

```text
~200–500 raw articles/day (15–20 RSS feeds)
       ↓
URL/title deduplication (§9, stages 1–2)
       ↓
rule-based relevance filter
       ↓
~30–80 relevant articles
       ↓
Luna extraction (§13)
       ↓
event clustering (§9, stage 3)
       ↓
~10–30 unique events
```

Exact thresholds are **TO BE DETERMINED**.

## 12. Event Persistence

Not every signal should matter for exactly one day.

Store:

```text
eventDate
firstSeenAt
lastSeenAt
impact
impactDirection
persistenceProfile
```

Freshness/decay is part of the ABRI methodology and is **TO BE DETERMINED**.

## 13. Daily AI Analysis — two-tier model split

**Decided.** Two models, two jobs, priced and used very differently:

| Model | Role | Call volume | Pricing |
|---|---|---|---|
| **Luna** (GPT-5.6) | Cheap, high-volume structured evidence extraction — one pass per relevant article (~30–80/day) | Many calls/day | $0.20/M input, $1.20/M output tokens |
| **Sol** (GPT-5.6) | Single high-value reasoning pass per day — interprets the day's clustered events into ABRI signals | One call/day | Higher cost per call, but only one call |

### Luna — extraction

Runs once per relevant article (post-filter, §11). Given the fetched
article page, Luna extracts:
- which ABRI factor(s) it touches
- direction (positive/negative) and a magnitude estimate
- named entities (company, amount, event type)
- a short factual summary
- source tier (passed through from §6, not inferred)

This is high volume but each call is small and cheap — it doesn't need
frontier-level reasoning, just reliable structured extraction.

### Event clustering

Luna's structured output (not raw article text) feeds §9 stage 3 —
clustering ~30–80 article extractions down to ~10–30 unique events.

### Sol — interpretation

Runs once per day, over the clustered events, not raw articles. Sol
receives:
- the day's ~10–30 clustered events (with Luna's extracted evidence)
- source tiers per event
- publication dates
- recent ABRI history (previous score/factors, per
  `ABRI_SCORING_METHODOLOGY.md` §5's "historical baseline" mechanic)

Sol's job is interpretation and judgment across the whole day's evidence —
the thing Luna's per-article extraction isn't meant to do. This is the
"single high-value reasoning pass" referred to throughout this document.

```text
~30–80 relevant articles
       ↓
Luna (per-article extraction)
       ↓
event clustering
       ↓
~10–30 unique events
       ↓
Sol (ONE daily reasoning call)
       ↓
structured ABRI signals
```

## 14. AI Output Contract

Both models return structured JSON. Two distinct schemas, matching §13's
two jobs.

### Luna — per-article extraction output

```json
{
  "article_id": "article_1",
  "relevant": true,
  "factor": "funding",
  "direction": "positive",
  "magnitude_estimate": 7,
  "entities": { "company": "Example AI Inc.", "amount_usd": 500000000 },
  "summary": "Example AI Inc. raised a $500M Series C led by...",
  "source_tier": 1
}
```

### Sol — daily interpretation output

```json
{
  "signals": [
    {
      "event_id": "evt_123",
      "factor": "funding",
      "direction": "positive",
      "magnitude": 8,
      "confidence": 0.91,
      "reason": "Large new funding round...",
      "source_ids": ["article_1", "article_2"]
    }
  ],
  "factor_assessment": {
    "funding": 82,
    "valuation": 76,
    "sentiment": 80,
    "infrastructure": 88,
    "correction": 42
  },
  "summary": "...",
  "uncertainties": []
}
```

Both schemas above are illustrative — the final field-level schema for
each is **TO BE DETERMINED**.

## 15. AI Boundary

Neither Luna nor Sol owns the final score — Luna extracts facts, Sol
interprets them into signals, and only the deterministic engine (§16)
turns those signals into a number.

Correct:

```text
News
 ↓
AI interpretation
 ↓
Structured signals
 ↓
Deterministic ABRI equation
 ↓
Final 0–100 score
```

Avoid:

```text
News
 ↓
AI
 ↓
"ABRI = 82"
```

This makes the score reproducible and auditable.

## 16. ABRI Scoring Engine

Conceptually:

```text
Factor inputs
     ↓
Normalize
     ↓
Apply freshness/persistence
     ↓
Apply weights
     ↓
Calculate
     ↓
Clamp 0–100
     ↓
Final ABRI
```

The mathematical equation, factor weights, thresholds and decay model are **TO BE DETERMINED**.

Keep this logic isolated under:

```text
/lib/scoring/
```

Every score must be reproducible from stored inputs.

## 17. Database

Minimum news pipeline tables:

### `news_sources`

```text
id
name
domain
tier
type
rss_url
active
created_at
updated_at
```

### `search_queries` (reserved — unused in MVP)

Not populated for MVP since there's no search API (§4). Kept defined so a
future search-API addition doesn't require a schema migration.

```text
id
query
factor
priority
active
created_at
updated_at
```

### `news_articles`

```text
id
source_id
title
url
canonical_url
description
author
published_at
discovered_at
retrieval_method
external_id
deduplication_hash
created_at
```

### `article_extractions`

Luna's per-article structured output (§13/§14), stored before event
clustering — keeps the pipeline reproducible per §29: every event's
underlying per-article evidence is retained, not just the clustered
result.

```text
id
article_id
factor
direction
magnitude_estimate
entities
summary
source_tier
created_at
```

### `events`

```text
id
title
description
event_date
first_seen_at
last_seen_at
category
status
created_at
updated_at
```

### `event_articles`

```text
event_id
article_id
confidence
created_at
```

### `news_signals`

```text
id
event_id
factor
direction
magnitude
confidence
explanation
created_at
```

### `daily_scores`

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

### `daily_score_signals`

```text
daily_score_id
signal_id
contribution
created_at
```

## 18. Daily Pipeline

```text
1. Poll 15–20 RSS feeds
2. Normalize articles
3. Deduplicate (URL/title, §9 stages 1–2)
4. Rule-based relevance filter (§11)
5. Fetch original article pages
6. Luna: per-article structured extraction (§13)
7. Cluster extractions into events (§9 stage 3)
8. Build evidence package for Sol
9. Sol: daily interpretation call (§13)
10. Validate AI output
11. Run deterministic ABRI equation (§16, ABRI_SCORING_METHODOLOGY.md)
12. Store daily score
13. Store factor explanations
14. Publish website
15. Make data available to newsletter
16. Future: send to social agent
```

## 19. Website Attribution

The `/news` page should show:

```text
Headline
Source
Published time
ABRI impact
[Show explanation]
[Read original →]
```

ABRI must not reproduce full external articles.

## 20. Newsletter

The weekly newsletter should consume existing database data rather than independently researching the web.

```text
Last 7 days
   ↓
Daily scores
   ↓
Major events
   ↓
Major signals
   ↓
Newsletter generation
   ↓
Email provider
```

Newsletter provider is **TO BE DETERMINED**.

## 21. Future X / Reddit Agent

Not part of MVP.

```text
daily_scores
    +
major_signals
    +
news_links
       ↓
Social Posting Agent
       ↓
X / Reddit
```

The agent must never independently calculate ABRI.

## 22. Provider Abstraction

```typescript
interface NewsSearchProvider {
  // defined but unused in MVP — see §4
  search(params: SearchParams): Promise<NewsArticle[]>
}

interface RssProvider {
  fetchFeed(feed: RssFeed): Promise<NewsArticle[]>
}

interface ExtractionAIProvider {
  extract(article: NewsArticle): Promise<ArticleExtraction>
}

interface InterpretationAIProvider {
  interpret(input: DailyEvidencePackage): Promise<AnalysisResult>
}
```

Potential implementations:

```text
NewsSearchProvider
 └── (unused in MVP — Tavily, if added later, per §4)

RssProvider
 └── GenericRSS

ExtractionAIProvider
 └── GPT-5.6 Luna

InterpretationAIProvider
 └── GPT-5.6 Sol
```

Two separate interfaces rather than one `AIProvider` — Luna and Sol have
different call shapes (per-article vs. once-daily), different volumes, and
different cost profiles (§24), so they should be independently swappable.

## 23. Error Handling

A single source failure must not stop the pipeline.

If a provider fails:
- log the failure
- continue with available sources
- record degraded pipeline status

If the AI call fails:
- do not publish an unverified new score
- retain the previous public score
- mark the daily run failed
- allow controlled retry

The pipeline must be idempotent.

## 24. Cost Control

The expensive step (Sol) is protected by cheap filtering and a cheap
extraction pass:

```text
RSS retrieval
      ↓
Cheap rule-based filtering (§11)
      ↓
URL/title deduplication (§9)
      ↓
Luna extraction (cheap, high-volume — §13)
      ↓
Event clustering
      ↓
Small evidence package
      ↓
ONE Sol call/day
```

Avoid sending duplicate articles, irrelevant articles or full article bodies unnecessarily.

### Spending ceiling — decided

An explicit API spending ceiling and budget alert goes into the production
setup **before deployment**, not added later:

- Target spend: **~$10–20/month**
- Hard/alert ceiling: **$30/month** initially
- Monitor Luna extraction volume and Sol's daily call separately (§25 adds
  per-model cost fields to the observability record)
- Alert if usage spikes unexpectedly (e.g. a feed starts producing far more
  "relevant" articles than normal, inflating Luna call volume)

**"Configure API spending limits/alerts" is a deployment checklist item**
(see the Definition of Done in `ABRI_ARCHITECTURE.md` §22), not something
to configure after launch.

## 25. Observability

Each run should record:

```text
pipeline_run_id
started_at
completed_at
status

rss_results_count
unique_articles_count
relevant_articles_count
luna_calls_count
luna_cost_estimate
unique_events_count
sol_calls_count
sol_cost_estimate

final_score
error_message
```

This lets the system answer:
- Why did ABRI not update?
- How much data informed today's score?
- Which retrieval sources were available?
- Is spend trending toward the §24 budget ceiling, and which model (Luna's
  volume or Sol's per-call cost) is driving it?

## 26. Security

- Keep provider API keys server-side.
- Never expose keys to the browser.
- Validate external URLs.
- Rate-limit public endpoints.
- Validate prediction inputs.
- Sanitize user names before inserting them into the declaration HTML.
- Escape dynamic content.
- Use appropriate security headers/CSP.

## 27. Recommended MVP — decided

```text
15–20 curated RSS feeds
        ↓
Normalize
        ↓
URL/title deduplication
        ↓
Rule-based relevance filter
        ↓
Luna: per-article extraction
        ↓
Event clustering
        ↓
Sol: one reasoning call/day
        ↓
Deterministic ABRI calculation
        ↓
PostgreSQL
        ↓
Next.js
```

Add a search API and/or broad discovery such as GDELT only if the curated RSS system proves insufficient (§4, §5).

## 28. Decisions Required Before Implementation

### News

Decided (§3, §4, §6):
- No search API/aggregator for MVP — RSS-only
- Publisher/RSS list — 15–20 feeds across 3 tiers (§3, §6)
- Source tiers — 5-tier classification, tiers 4–5 currently empty/reserved

Still genuinely open:
- Exact RSS feed URLs (need verification at implementation time — see §3's
  note on feed drift)
- Source weighting formula (tier → numeric weight mapping)
- Exact retrieval schedule (example times in §7 only)
- Event clustering method/algorithm (§9 stage 3 describes the concept and
  where it sits in the pipeline, not the algorithm)

### AI

Decided (§13):
- Two-model split — GPT-5.6 Luna (extraction) + GPT-5.6 Sol (interpretation)
- Provider: OpenAI

Still genuinely open:
- Exact prompts for both models
- Structured output schema field-level detail (§14 examples are
  illustrative, not final)
- Maximum evidence package size for Sol's daily call
- Fallback model if Luna/Sol are unavailable or rate-limited

### ABRI

Decided — see `ABRI_SCORING_METHODOLOGY.md`: factor definitions and
weights (§2), hybrid mathematical model (§1/§3), freshness decay curve
(§4), ~~contradictory evidence handling~~ (§4/§5 — tier/confidence-weighted
netting for opposing signals, event-clustering rule for factually
conflicting reports on the same event). Still open (that doc's §8):
correction-penalty weight, per-factor normalization rubrics, decay curve
interpolation, event-persistence classification validation, status
thresholds.

### Infrastructure
- Hosting
- PostgreSQL provider
- Scheduler/cron
- Monitoring

Do not silently choose these during implementation.

## 29. Core Principle

> **ABRI should be able to explain every score.**

For any daily score:

```text
ABRI 78
   ↓
Factor contributions
   ↓
Underlying signals
   ↓
Events
   ↓
External sources
```

The result should be an auditable historical dataset, not merely an AI-generated number.



