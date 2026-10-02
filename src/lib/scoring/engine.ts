import {
  CORRECTION_WEIGHT, DECAY_ANCHORS, FACTORS, HEAT_WEIGHTS, PERSISTENCE_FLOOR, SCORING, STATUS_BANDS, TIER_WEIGHT,
  type Factor, type PersistenceClass,
} from '../config'

// Deterministic ABRI engine (ABRI_SCORING_METHODOLOGY.md). Pure functions only:
// the same stored inputs always reproduce the same score. No AI, no I/O.

export type ScoringSignal = {
  id: string
  factor: Factor
  direction: 'up' | 'down'
  magnitude: number // 1–10
  confidence: number // 0–1
  persistenceClass: PersistenceClass
  ageDays: number // score date − event date
  relevance: number // 0–1, extractor's relevance probability for the event
  sourceTier: number // best tier among the event's sources
}

export type FactorResult = { score: number; previous: number; impact: number; dispersed: boolean }

export type ScoreResult = {
  score: number
  rawScore: number
  status: string
  heatScore: number
  correctionPenalty: number
  factors: Record<Factor, FactorResult>
  contributions: { signalId: string; weight: number; contribution: number }[]
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const round2 = (n: number) => Math.round(n * 100) / 100

// ── normalization ──────────────────────────────────────────────────────
// §4: linear interpolation between the anchor points.
export function baseDecay(ageDays: number): number {
  const age = Math.max(0, ageDays)
  for (let i = 1; i < DECAY_ANCHORS.length; i++) {
    const [a0, m0] = DECAY_ANCHORS[i - 1]
    const [a1, m1] = DECAY_ANCHORS[i]
    if (age <= a1) return m0 + ((age - a0) / (a1 - a0)) * (m1 - m0)
  }
  return 0
}

export const freshness = (ageDays: number, cls: PersistenceClass) =>
  Math.max(baseDecay(ageDays), PERSISTENCE_FLOOR[cls])

// §4: signal_weight = base_impact × freshness × relevance × tier_weight × confidence
export function signalWeight(s: ScoringSignal): number {
  return (
    (s.magnitude / 10) *
    freshness(s.ageDays, s.persistenceClass) *
    clamp(s.relevance, 0, 1) *
    (TIER_WEIGHT[s.sourceTier] ?? TIER_WEIGHT[4]) *
    clamp(s.confidence, 0, 1)
  )
}

// ── calculation ────────────────────────────────────────────────────────
export function statusFor(score: number): string {
  return STATUS_BANDS.find(([min]) => score >= min)![1]
}

// §3, Option 2: rescaled heat weights minus an independent correction penalty.
export function abriFromFactors(f: Record<Factor, number>) {
  const heatScore =
    f.funding * HEAT_WEIGHTS.funding + f.valuation * HEAT_WEIGHTS.valuation +
    f.sentiment * HEAT_WEIGHTS.sentiment + f.infrastructure * HEAT_WEIGHTS.infrastructure
  const correctionPenalty = f.correction * CORRECTION_WEIGHT
  const rawScore = clamp(heatScore - correctionPenalty, 0, 100)
  return { heatScore, correctionPenalty, rawScore, score: Math.round(rawScore) }
}

// ── weighting ──────────────────────────────────────────────────────────
// §5: FactorScore_today = clamp(FactorScore_yesterday + Σ(weight × direction × sensitivity), 0, 100)
// Each signal is applied once, on the day it is first interpreted. With no
// signals a factor holds flat.
export function computeScore(previousFactors: Record<Factor, number>, signals: ScoringSignal[]): ScoreResult {
  const factors = {} as Record<Factor, FactorResult>
  const contributions: ScoreResult['contributions'] = []

  for (const factor of FACTORS) {
    const own = signals.filter((s) => s.factor === factor)
    const raw = own.map((s) => {
      const weight = signalWeight(s)
      return { signalId: s.id, weight, contribution: weight * (s.direction === 'up' ? 1 : -1) * SCORING.sensitivity }
    })
    const net = raw.reduce((sum, c) => sum + c.contribution, 0)
    const gross = raw.reduce((sum, c) => sum + Math.abs(c.contribution), 0)

    // Cap the daily move; scale each contribution so they still sum to the applied move.
    const capped = clamp(net, -SCORING.maxDailyFactorMove, SCORING.maxDailyFactorMove)
    const scale = net !== 0 ? capped / net : 1
    const previous = previousFactors[factor]
    const score = clamp(previous + capped, 0, 100)

    for (const c of raw) {
      contributions.push({ signalId: c.signalId, weight: round2(c.weight), contribution: round2(c.contribution * scale) })
    }
    factors[factor] = {
      score: round2(score),
      previous: round2(previous),
      impact: round2(score - previous),
      dispersed: own.length >= 2 && gross > 0 && Math.abs(net) / gross < SCORING.dispersionThreshold,
    }
  }

  const abri = abriFromFactors(Object.fromEntries(FACTORS.map((f) => [f, factors[f].score])) as Record<Factor, number>)
  return {
    score: abri.score,
    rawScore: round2(abri.rawScore),
    status: statusFor(abri.score),
    heatScore: round2(abri.heatScore),
    correctionPenalty: round2(abri.correctionPenalty),
    factors,
    contributions,
  }
}
