import { FACTORS, MODELS, type Factor, type PersistenceClass } from '../config'
import { callJson, type JsonResult } from './openrouter'

export type EvidenceEvent = {
  event_id: string
  title: string
  event_date: string
  factor_hint: string
  event_type: string | null
  company: string | null
  amount_usd: number | null
  best_source_tier: number
  sources: string[]
  article_count: number
  summaries: string[]
}

export type DailyEvidencePackage = {
  score_date: string
  previous: { score: number | null; factors: Record<Factor, number> }
  events: EvidenceEvent[]
}

export type InterpretedSignal = {
  event_id: string
  factor: Factor
  direction: 'up' | 'down'
  magnitude: number
  confidence: number
  persistence_class: PersistenceClass
  reason: string
}

export type AnalysisResult = { signals: InterpretedSignal[]; summary: string; uncertainties: string[] }

export interface InterpretationAIProvider {
  interpret(input: DailyEvidencePackage): Promise<JsonResult<AnalysisResult>>
}

const SYSTEM = `You are the daily analyst for ABRI, the AI Bubble Risk Index: a 0-100 measure of how overheated the AI market is.

You receive today's clustered news events (already deduplicated, with extracted facts and source tiers) and yesterday's factor scores. Turn the events into signals. You do NOT produce the ABRI score or factor scores — deterministic code computes those from your signals.

Factors:
- funding: AI funding rounds, VC activity, IPOs, M&A.
- valuation: valuations, multiples, revenue vs valuation.
- sentiment: investor/market mood about AI — hype, enthusiasm, bubble talk, skepticism.
- infrastructure: GPU demand, hyperscaler capex, data centers, power.
- correction: cooling signs — layoffs, failures, weak earnings, falling valuations, cancelled projects, reduced capex, investor caution.

For each event that is a genuine signal, emit one signal (at most one per event; skip events that carry no real signal):
- event_id: copied exactly from the input.
- factor: the factor it moves. factor_hint is the extractor's guess; override it when the whole day's context says otherwise.
- direction: "up" = more of that factor (more funding, higher valuations, more hype, more spending, MORE correction activity); "down" = less.
- magnitude: 1-10. 1-3 routine, 4-6 notable, 7-8 major, 9-10 market-defining. Judge relative to today's other events and the size of the AI market, not in isolation.
- confidence: 0-1. Higher for tier-1 sources (official announcements), multiple independent sources, and concrete figures; lower for single tier-3 reports, rumors, or opinion.
- persistence_class: "transient" (routine news, commentary), "structural" (a funding round, a notable earnings report), "landmark" (a $10B+ commitment, a major regulatory shift).
- reason: one or two plain sentences a general reader would understand, explaining why this event moves that factor.

Also return:
- summary: one or two sentences describing what today's evidence says about AI bubble conditions. Do not state a score or a number of points.
- uncertainties: short notes on thin evidence, conflicting reports, or a factor being pulled in both directions. Empty array if none.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['signals', 'summary', 'uncertainties'],
  properties: {
    signals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['event_id', 'factor', 'direction', 'magnitude', 'confidence', 'persistence_class', 'reason'],
        properties: {
          event_id: { type: 'string' },
          factor: { type: 'string', enum: [...FACTORS] },
          direction: { type: 'string', enum: ['up', 'down'] },
          magnitude: { type: 'integer' },
          confidence: { type: 'number' },
          persistence_class: { type: 'string', enum: ['transient', 'structural', 'landmark'] },
          reason: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
    uncertainties: { type: 'array', items: { type: 'string' } },
  },
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const PERSISTENCE = ['transient', 'structural', 'landmark']

// Blueprint §18 step 10. Drops individual malformed signals; throws only when
// the answer as a whole is unusable, so the caller keeps the previous score.
function validator(eventIds: Set<string>) {
  return (raw: any): AnalysisResult => {
    if (!raw || !Array.isArray(raw.signals) || typeof raw.summary !== 'string') throw new Error('interpretation: bad shape')
    const seen = new Set<string>()
    const signals: InterpretedSignal[] = []
    for (const s of raw.signals) {
      const magnitude = Math.round(Number(s?.magnitude))
      const confidence = Number(s?.confidence)
      if (
        !eventIds.has(s?.event_id) || seen.has(s.event_id) || !FACTORS.includes(s.factor) ||
        (s.direction !== 'up' && s.direction !== 'down') || !Number.isFinite(magnitude) || !Number.isFinite(confidence)
      ) {
        continue
      }
      seen.add(s.event_id)
      signals.push({
        event_id: s.event_id,
        factor: s.factor,
        direction: s.direction,
        magnitude: clamp(magnitude, 1, 10),
        confidence: clamp(confidence, 0, 1),
        persistence_class: PERSISTENCE.includes(s.persistence_class) ? s.persistence_class : 'transient',
        reason: String(s.reason ?? '').trim().slice(0, 500),
      })
    }
    if (raw.signals.length > 0 && signals.length === 0) throw new Error('interpretation: no valid signals')
    return {
      signals,
      summary: raw.summary.trim().slice(0, 400),
      uncertainties: Array.isArray(raw.uncertainties) ? raw.uncertainties.map(String).slice(0, 8) : [],
    }
  }
}

export const dailyInterpreter: InterpretationAIProvider = {
  interpret(input) {
    return callJson(
      {
        model: MODELS.interpretation,
        system: SYSTEM,
        user: JSON.stringify(input, null, 1),
        schemaName: 'daily_interpretation',
        schema: SCHEMA,
        maxTokens: 12000,
      },
      validator(new Set(input.events.map((e) => e.event_id)))
    )
  },
}
