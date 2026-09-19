# ABRI Scoring Engine — Methodology Specification

Status: **Draft v1 — decided in principle, several constants/mechanisms still
open for confirmation** (see §8). This document resolves the "ABRI
methodology" items marked `TO BE DETERMINED` in `ABRI_ARCHITECTURE.md` §9
and §21, per the rule in §23 of that document: decisions get written down
here before any production logic is built around them.

This is a specification, not an implementation. No scoring code should be
written from this document without a pass to confirm §8.

---

## 1. Core approach: Hybrid (AI signal extraction + deterministic engine)

ABRI measures **bubble conditions**, not raw AI sentiment. Three approaches
were considered:

| Option | Description | Verdict |
|---|---|---|
| A. Weighted factor model | Deterministic formula over 5 normalized factor scores | Used as the **calculation core** |
| B. AI gives the score directly | Ask a frontier model "what should ABRI be?" | **Rejected** as the core method — not reproducible or defensible, can't explain "why X today" reliably |
| C. Hybrid | AI extracts/classifies/scores individual signals; a deterministic engine turns those signals into the final number | **Chosen** |

**Chosen pipeline:**

```text
News items
    │
    ▼
AI analysis layer (per item)
    - relevant? (yes/no)
    - which factor does it belong to? (1 of 5, or none)
    - magnitude/direction of impact
    - persistence class (see §4)
    - short explanation
    - anomaly flag
    │
    ▼
Deterministic scoring engine
    - apply freshness decay to each signal
    - roll signals up into 5 factor scores (0–100 each)
    - apply factor weights
    - apply correction-signal penalty
    - clamp/round → final ABRI (0–100)
    - map to status band
    │
    ▼
daily_scores + score_factors (persisted, reproducible from stored inputs)
```

The AI never outputs the ABRI number itself. It only classifies and scores
*individual signals*; the arithmetic that turns those into ABRI is 100%
deterministic and reproducible from stored inputs, per the reliability
requirement in `ABRI_ARCHITECTURE.md` §18.

---

## 2. The five factors

Five factors, not ten-plus — kept deliberately small so each one stays
explainable.

| # | Factor | Weight | Direction | Example signals |
|---|---|---|---|---|
| ① | Funding / Investment | 25% | positive | AI startup funding, mega-rounds, VC activity, IPO activity, M&A |
| ② | Valuations | 25% | positive | Startup valuations, public AI company multiples, revenue/valuation ratios, valuation growth |
| ③ | Market / Investor Sentiment | 20% | positive | Bullish vs. bearish sentiment, AI hype, investor enthusiasm, market expectations |
| ④ | Infrastructure Spending | 20% | positive | GPU demand, hyperscaler capex, data-center investment, AI infra expansion |
| ⑤ | Correction Signals | 10% | **negative (dampener)** | Layoffs, declining demand, failed startups, disappointing earnings, falling valuations, cancelled projects, reduced capex, investor caution |

Each factor is normalized to **0–100** independently before weighting (see
§5 for how a factor's score is derived day-to-day).

---

## 3. Formula — resolving the sign of Correction Signals

Your notes include a worked example where Correction Signals is *added* into
the weighted sum (`40 × 0.10 = +4.0`), but the accompanying design note says
it should act as a **negative component**, since more correction activity
means the bubble is *cooling*, not heating up further. Those two are
inconsistent as written — this section is the resolution.

**Correction Signals is a penalty subtracted from the heat score, not a 5th
positive addend.**

```text
HeatScore = (Funding × 0.25) + (Valuations × 0.25)
          + (Sentiment × 0.20) + (Infrastructure × 0.20)

CorrectionPenalty = CorrectionSignalScore × correction_weight

ABRI = round(clamp(HeatScore − CorrectionPenalty, 0, 100))
```

This leaves one open constant: **`correction_weight`**, i.e. how much
correction activity is allowed to pull the score down. Two candidate
options:

- **Option 1 — literal weight (`correction_weight = 0.10`).** Matches your
  original 10% allocation exactly. Penalty range: 0–10 points. Heat-only
  ceiling (correction = 0) is **90**, not 100 — full 91–100 territory
  requires near-nonexistent correction activity *and* isn't reachable at
  all under pure heat. Simplest, most literal reading of your notes.
- **Option 2 — rescaled heat + independent penalty (recommended).** Rescale
  the four heat weights so they sum to 100 (Funding 28%, Valuations 28%,
  Sentiment 22%, Infrastructure 22% — close to the original 25/25/20/20
  ratio), so a zero-correction day can reach a true 100. Then give
  correction its own, slightly stronger penalty range, e.g.
  `correction_weight = 0.15–0.20` (max 15–20 point pull-down), decoupled
  from the original 10% slot. This makes correction signals a *meaningful*
  counterweight — matching the stated goal that "ABRI shouldn't only
  measure heat" — rather than a capped-at-10 afterthought.

Recommendation: **Option 2**, with `correction_weight = 0.15` as a starting
point. This is a judgment call, not a hard decision — confirm before
implementation.

### Worked example (using Option 2, rescaled weights, weight = 0.15)

```text
Funding            82 × 0.28 = 22.96
Valuations         91 × 0.28 = 25.48
Sentiment          76 × 0.22 = 16.72
Infrastructure     88 × 0.22 = 19.36
                                -----
HeatScore                      84.52

Correction         40 × 0.15 =  6.00  (penalty, subtracted)
                                -----
ABRI                           78.52 → 79
```

(Same input factor scores as your original example — the outcome shifts
from 80 to 79 once correction is a penalty instead of an addend, which is
the intended effect: heavy correction activity should cost more than a flat
+4.)

---

## 4. Freshness and decay

Signals should heavily favor recent information:

```text
signal_weight = base_impact × freshness_multiplier × relevance
```

Base decay curve (as specified):

| Age | Multiplier |
|---|---|
| Today | 1.00 |
| 1 day | 0.90 |
| 2 days | 0.80 |
| 3 days | 0.70 |
| 7 days | 0.40 |
| 14 days | 0.15 |

Shape: roughly linear for the first few days, steepening after — treat the
table above as anchor points for an interpolated/exponential-ish curve
rather than a hard-coded 14-row lookup. Exact interpolation function is
open (§8).

### Freshness vs. event persistence

Flagged in your notes as needing careful design, **not settled here** —
this is a proposal to react to, not a locked mechanism.

**Proposal:** the AI classification step assigns each signal a
`persistence_class`, which sets a *floor* under the decay curve instead of
letting it decay to zero:

| Class | Example | Decay floor |
|---|---|---|
| `transient` | routine daily news, minor commentary | 0.00 (decays fully, per table above) |
| `structural` | a funding round, a notable earnings report | 0.25 |
| `landmark` | a $10B+ infra announcement, a major regulatory shift | 0.55 |

```text
effective_multiplier = max(base_decay(age), persistence_floor[class])
```

So a landmark event decays normally for the first few days (while it's
still the freshest, most-weighted thing driving the score) but never drops
below 0.55 — it keeps a meaningful, permanent-ish influence on its factor's
baseline rather than vanishing after two weeks. This needs real signal
examples to validate before it's finalized.

---

## 5. How a factor's daily score is derived

"Each factor itself is calculated from fresh signals + historical
baseline" — made concrete:

```text
FactorScore_today = clamp(
  FactorScore_yesterday + Σ(signal_weight × signal_direction × sensitivity),
  0, 100
)
```

- `FactorScore_yesterday` — the factor's own persisted score from the prior
  `daily_scores` row (the "historical baseline"). This is what makes ABRI
  behave like a market index (momentum + fresh evidence) rather than
  recomputing from scratch every day.
- `signal_direction` — `+1` or `-1` *within* the factor (e.g. inside
  Funding, a mega-round is `+1`, a report of VCs pulling back is `-1`).
  Only the Correction Signals factor itself is entirely dampener-side at
  the top level (§3) — internally, its own score still moves up/down
  based on how much correction activity is happening.
- `sensitivity` — a tunable constant capping how far a single day's news
  can move one factor, to avoid wild single-headline swings. Value: open
  (§8).

First-run / no-history case (bootstrapping day 1): open (§8).

---

## 6. Status bands

`daily_scores.status` (from `ABRI_ARCHITECTURE.md` §10) needs thresholds.
Proposed, not confirmed:

| Score | Status |
|---|---|
| 0–29 | `COLD` |
| 30–49 | `WARM` |
| 50–69 | `ELEVATED` |
| 70–84 | `HOT` |
| 85–100 | `VERY_HOT` |

Note: the current frontend hardcodes "VERY HOT" at a score of 78 as
placeholder UI copy — that content isn't derived from a real engine yet, so
don't treat it as a constraint on these bands. Adjust once real scoring
data exists.

---

## 7. Division of responsibility (AI layer vs. engine)

**AI layer, per news item** (matches `ABRI_ARCHITECTURE.md` §7's
`analyzeDailyNews(newsItems)` interface):
- Relevance filter (is this an AI-bubble-relevant signal at all?)
- Factor classification (1 of the 5, or "not relevant")
- Magnitude + direction estimate
- Persistence class (§4, proposed)
- Short explanation (feeds the "why did ABRI become X" requirement)
- Anomaly/unusual-development flag

**Deterministic engine** (`/scoring` module per §9 of the architecture
doc):
- `inputs` — today's classified signals + yesterday's factor scores
- `normalization` — apply freshness decay (§4)
- `weighting` — roll signals into factor scores (§5), apply factor weights
  and correction penalty (§3)
- `calculation` — produce final ABRI + status band (§6)
- `validation` — clamp to 0–100, sanity-check against prior day, refuse to
  silently overwrite history (per §18)

Every stored score keeps its input signals and per-factor breakdown
(`score_factors` table), so "why did ABRI become X today" is always
answerable from stored data, never recomputed from a live AI call.

---

## 8. Open questions — not decided, do not implement against these silently

Per `ABRI_ARCHITECTURE.md` §23, these need explicit confirmation before
production code is built around them:

- **Correction penalty weight** — Option 1 (0.10) vs. Option 2 (0.15–0.20,
  recommended) from §3.
- **Per-factor normalization rubric** — the concrete rule for turning "3
  mega funding rounds this week" into a 0–100 number. Not specified yet for
  any of the 5 factors.
- **Decay curve interpolation** — exact function between the anchor points
  in §4 (linear segments? exponential fit?).
- **Event-persistence classification** — the `transient/structural/landmark`
  proposal in §4 is a draft, not a decision. Needs validation against real
  signal examples.
- **`sensitivity` constant(s)** in §5 — how much one day's news can move a
  factor.
- **Day-1 bootstrap** — what `FactorScore_yesterday` is before any history
  exists.
- **Missing/sparse news days** — does a factor score hold flat, or decay
  toward a neutral midpoint (50) when there's nothing fresh to report?
- **Conflicting same-day signals** — e.g. one article says funding is
  booming, another says a major VC pulled back, same day, same factor. Net
  them, or weight by source credibility?
- **Status band thresholds** — §6 is a proposal only.
