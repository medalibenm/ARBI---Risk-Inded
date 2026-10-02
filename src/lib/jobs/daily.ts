import { jevExtractor } from '../ai/extract'
import { dailyInterpreter, type DailyEvidencePackage, type EvidenceEvent } from '../ai/interpret'
import {
  BOOTSTRAP_FACTORS, CLUSTERING, FACTORS, FACTOR_LABELS, RETRIEVAL, SCORE_TIMEZONE, TIER_WEIGHT,
  type Factor,
} from '../config'
import { newId, query, transaction } from '../db'
import { clusterExtractions } from '../news/cluster'
import { pollFeeds } from '../news/poll'
import { computeScore, type ScoringSignal } from '../scoring/engine'
import { dateInZone, daysBetween } from '../time'

export type DailyResult =
  | { status: 'skipped'; date: string; reason: string }
  | { status: 'ok'; date: string; score: number; change: number | null; events: number; signals: number }

// The single daily job (blueprint §18). Safe to rerun: a date that already has
// a score is never recomputed, and a failed run leaves no score behind — the
// previous public score stays up and the next invocation retries.
export async function runDailyUpdate(now = new Date()): Promise<DailyResult> {
  const date = dateInZone(now, SCORE_TIMEZONE)
  if ((await query(`SELECT 1 FROM daily_scores WHERE date = $1`, [date])).length) {
    return { status: 'skipped', date, reason: 'score already stored for this date' }
  }

  const runId = newId()
  await query(`INSERT INTO pipeline_runs (id, kind, score_date) VALUES ($1, 'daily', $2)`, [runId, date])
  const stats = { extractionCalls: 0, extractionCost: 0, interpretationCalls: 0, interpretationCost: 0, events: 0 }

  try {
    const poll = await pollFeeds()
    await extractPending(stats)
    await clusterExtractions()

    const previous = await loadPrevious(date)
    const evidence = await buildEvidence(date, previous)
    stats.events = evidence.events.length

    // No new events: no model call, factors hold flat.
    let analysis = { signals: [], summary: 'No new market signals today; ABRI holds at its previous level.', uncertainties: [] } as
      Awaited<ReturnType<typeof dailyInterpreter.interpret>>['data']
    let model = 'none'
    if (evidence.events.length > 0) {
      const result = await dailyInterpreter.interpret(evidence)
      stats.interpretationCalls = 1
      stats.interpretationCost = result.cost
      analysis = result.data
      model = result.model
    }
    await query(
      `UPDATE pipeline_runs SET interpretation_model = $2, interpretation_input = $3::jsonb, interpretation_output = $4::jsonb
        WHERE id = $1`,
      [runId, model, JSON.stringify(evidence), JSON.stringify(analysis)]
    )

    const eventMeta = new Map(evidence.events.map((e) => [e.event_id, e]))
    const relevance = await eventRelevance([...eventMeta.keys()])
    const signalRows = analysis.signals.map((s) => ({ ...s, id: newId() }))
    const scoringSignals: ScoringSignal[] = signalRows.map((s) => ({
      id: s.id,
      factor: s.factor,
      direction: s.direction,
      magnitude: s.magnitude,
      confidence: s.confidence,
      persistenceClass: s.persistence_class,
      ageDays: Math.max(0, daysBetween(eventMeta.get(s.event_id)!.event_date, date)),
      relevance: relevance.get(s.event_id) ?? 1,
      sourceTier: eventMeta.get(s.event_id)!.best_source_tier,
    }))

    const result = computeScore(previous.factors, scoringSignals)
    const change = previous.score === null ? null : result.score - previous.score
    const uncertainties = [
      ...analysis.uncertainties,
      ...FACTORS.filter((f) => result.factors[f].dispersed).map(
        (f) => `${FACTOR_LABELS[f]} was pulled in both directions today; opposing signals largely cancelled out.`
      ),
    ]

    const scoreId = newId()
    await transaction(async (q) => {
      // UNIQUE(date) makes a concurrent duplicate run fail here instead of overwriting.
      await q(
        `INSERT INTO daily_scores (id, date, score, raw_score, previous_score, change, status, summary, uncertainties)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
        [scoreId, date, result.score, result.rawScore, previous.score, change, result.status, analysis.summary, JSON.stringify(uncertainties)]
      )
      for (const f of FACTORS) {
        const top = signalRows
          .filter((s) => s.factor === f)
          .sort((a, b) => b.magnitude * b.confidence - a.magnitude * a.confidence)[0]
        await q(
          `INSERT INTO score_factors (id, daily_score_id, name, category, score, previous_score, impact, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [newId(), scoreId, FACTOR_LABELS[f], f, result.factors[f].score, result.factors[f].previous, result.factors[f].impact, top?.reason ?? null]
        )
      }
      for (const s of signalRows) {
        await q(
          `INSERT INTO news_signals (id, event_id, factor, direction, magnitude, confidence, persistence_class, explanation, model)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [s.id, s.event_id, s.factor, s.direction, s.magnitude, s.confidence, s.persistence_class, s.reason, model]
        )
      }
      for (const c of result.contributions) {
        await q(`INSERT INTO daily_score_signals (daily_score_id, signal_id, weight, contribution) VALUES ($1,$2,$3,$4)`, [
          scoreId, c.signalId, c.weight, c.contribution,
        ])
      }
      // Every event in today's package is consumed, signal or not, so it is never re-scored.
      if (evidence.events.length) {
        await q(`UPDATE events SET status = 'scored', updated_at = now() WHERE id = ANY($1)`, [[...eventMeta.keys()]])
      }
    })

    await finishRun(runId, poll.failedSources.length ? 'degraded' : 'ok', stats, result.score, null)
    return { status: 'ok', date, score: result.score, change, events: evidence.events.length, signals: signalRows.length }
  } catch (err) {
    await finishRun(runId, 'failed', stats, null, String((err as Error)?.message ?? err)).catch(() => {})
    throw err
  }
}

async function finishRun(
  runId: string, status: string, stats: Record<string, number>, score: number | null, error: string | null
) {
  await query(
    `UPDATE pipeline_runs SET completed_at = now(), status = $2, extraction_calls_count = $3, extraction_cost_estimate = $4,
       unique_events_count = $5, interpretation_calls_count = $6, interpretation_cost_estimate = $7, final_score = $8,
       error_message = $9 WHERE id = $1`,
    [runId, status, stats.extractionCalls, stats.extractionCost, stats.events, stats.interpretationCalls, stats.interpretationCost, score, error]
  )
}

// Steps 5–6: per-article extraction over everything the rule filter passed.
async function extractPending(stats: { extractionCalls: number; extractionCost: number }) {
  const cutoff = new Date(Date.now() - RETRIEVAL.maxArticleAgeHours * 3_600_000).toISOString()
  const pending = await query(
    `SELECT a.id, a.title, a.url, a.description, a.published_at, s.name AS source_name, s.tier
       FROM news_articles a JOIN news_sources s ON s.id = a.source_id
      WHERE a.status = 'pending' AND a.published_at >= $1
      ORDER BY a.rule_score DESC, s.tier, a.published_at DESC
      LIMIT $2`,
    [cutoff, RETRIEVAL.maxExtractionsPerRun]
  )

  let next = 0
  const worker = async () => {
    while (next < pending.length) {
      const a = pending[next++]
      try {
        const { data, model, cost } = await jevExtractor.extract({
          id: a.id, title: a.title, url: a.url, description: a.description,
          sourceName: a.source_name, sourceTier: a.tier, publishedAt: new Date(a.published_at),
        })
        stats.extractionCalls++
        stats.extractionCost += cost
        await query(
          `INSERT INTO article_extractions
             (id, article_id, relevant, relevance_probability, factor, direction, magnitude_estimate, event_type, entities, summary, source_tier, model)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12) ON CONFLICT (article_id) DO NOTHING`,
          [newId(), a.id, data.relevant, data.relevance_probability, data.factor, data.direction, data.magnitude_estimate,
           data.event_type, JSON.stringify(data.entities), data.summary, a.tier, model]
        )
        await query(`UPDATE news_articles SET status = 'extracted' WHERE id = $1`, [a.id])
      } catch (err) {
        console.error(`extraction failed for ${a.id}:`, (err as Error).message)
        await query(
          `UPDATE news_articles SET attempts = attempts + 1,
             status = CASE WHEN attempts + 1 >= $2 THEN 'failed' ELSE status END WHERE id = $1`,
          [a.id, RETRIEVAL.maxExtractionAttempts]
        )
      }
    }
  }
  await Promise.all(Array.from({ length: RETRIEVAL.extractionConcurrency }, worker))

  // If the extractor is down entirely, fail the run rather than score a day on no evidence.
  if (pending.length > 0 && stats.extractionCalls === 0) throw new Error('all extraction calls failed')
}

async function loadPrevious(date: string): Promise<{ score: number | null; factors: Record<Factor, number> }> {
  const [prev] = await query(`SELECT id, score FROM daily_scores WHERE date < $1 ORDER BY date DESC LIMIT 1`, [date])
  if (!prev) return { score: null, factors: { ...BOOTSTRAP_FACTORS } }
  const rows = await query(`SELECT category, score FROM score_factors WHERE daily_score_id = $1`, [prev.id])
  const factors = { ...BOOTSTRAP_FACTORS }
  for (const r of rows) factors[r.category as Factor] = Number(r.score)
  return { score: prev.score, factors }
}

// Step 8: the evidence package — new events only, strongest first, capped.
async function buildEvidence(date: string, previous: DailyEvidencePackage['previous']): Promise<DailyEvidencePackage> {
  const rows = await query(
    `SELECT e.id, e.title, e.event_date, e.category, e.event_type, e.company,
            s.name AS source_name, s.tier, COALESCE(NULLIF(x.summary, ''), LEFT(a.description, 300)) AS summary, x.entities, x.magnitude_estimate
       FROM events e
       JOIN event_articles ea ON ea.event_id = e.id
       JOIN news_articles a ON a.id = ea.article_id
       JOIN news_sources s ON s.id = a.source_id
       JOIN article_extractions x ON x.article_id = a.id
      WHERE e.status = 'new'
      ORDER BY s.tier, a.published_at`
  )

  const events = new Map<string, EvidenceEvent & { strength: number }>()
  for (const r of rows) {
    let e = events.get(r.id)
    if (!e) {
      // first row is the highest-tier article: its figures are authoritative
      e = {
        event_id: r.id, title: r.title, event_date: r.event_date, factor_hint: r.category, event_type: r.event_type,
        company: r.company, amount_usd: r.entities?.amount_usd ?? null, best_source_tier: r.tier,
        sources: [], article_count: 0, summaries: [], strength: 0,
      }
      events.set(r.id, e)
    }
    e.article_count++
    if (!e.sources.includes(r.source_name)) e.sources.push(r.source_name)
    if (e.summaries.length < 3 && r.summary) e.summaries.push(r.summary)
    e.strength = Math.max(e.strength, (r.magnitude_estimate ?? 0) * (TIER_WEIGHT[r.tier] ?? 0.5))
  }

  const top = [...events.values()]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, CLUSTERING.maxEventsForInterpretation)
    .map(({ strength, ...e }) => e)
  return { score_date: date, previous, events: top }
}

async function eventRelevance(eventIds: string[]): Promise<Map<string, number>> {
  if (!eventIds.length) return new Map()
  const rows = await query(
    `SELECT ea.event_id, AVG(x.relevance_probability) AS relevance
       FROM event_articles ea JOIN article_extractions x ON x.article_id = ea.article_id
      WHERE ea.event_id = ANY($1) GROUP BY ea.event_id`,
    [eventIds]
  )
  return new Map(rows.map((r) => [r.event_id, Number(r.relevance)]))
}
