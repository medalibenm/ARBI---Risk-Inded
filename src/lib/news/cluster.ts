import { CLUSTERING, SCORE_TIMEZONE } from '../config'
import { newId, query } from '../db'
import { dateInZone } from '../time'
import { jaccard, tokens } from './dedup'

// Dedup stage 3 (blueprint §9): cluster on the extractor's structured output,
// not headlines. GUESS — the algorithm: an article joins an existing event when
// it shares company + event type + factor, or when its summary overlaps the
// event's description strongly enough. Otherwise it starts a new event.

type Candidate = {
  id: string
  category: string
  company: string | null
  eventType: string | null
  tokens: Set<string>
}

const normCompany = (c: string | null | undefined) =>
  c ? c.toLowerCase().replace(/\b(inc|corp|corporation|ltd|llc|ai|labs?)\b|[^a-z0-9]/g, '') || null : null

export async function clusterExtractions(): Promise<{ newEvents: number; attached: number }> {
  // Highest tier first: the first article of an event defines its title, date
  // and figures, so the best source becomes the event's authoritative record.
  const pending = await query(
    `SELECT a.id, a.title, a.published_at, s.tier, x.factor, x.event_type, x.entities, COALESCE(NULLIF(x.summary, ''), a.description) AS summary
       FROM article_extractions x
       JOIN news_articles a ON a.id = x.article_id
       JOIN news_sources s ON s.id = a.source_id
       LEFT JOIN event_articles ea ON ea.article_id = a.id
      WHERE x.relevant AND ea.article_id IS NULL
      ORDER BY s.tier, a.published_at`
  )
  if (pending.length === 0) return { newEvents: 0, attached: 0 }

  const since = new Date(Date.now() - CLUSTERING.windowHours * 3_600_000).toISOString()
  const candidates: Candidate[] = (
    await query(`SELECT id, category, company, event_type, title, description FROM events WHERE first_seen_at >= $1`, [since])
  ).map((e) => ({
    id: e.id,
    category: e.category,
    company: normCompany(e.company),
    eventType: e.event_type,
    tokens: tokens(`${e.title} ${e.description ?? ''}`),
  }))

  let newEvents = 0
  let attached = 0
  for (const p of pending) {
    const company = normCompany(p.entities?.company)
    const t = tokens(`${p.title} ${p.summary ?? ''}`)

    let best: { candidate: Candidate; confidence: number } | null = null
    for (const c of candidates) {
      const similarity = jaccard(c.tokens, t)
      const sameEntity = company !== null && c.company === company && c.eventType === p.event_type && c.category === p.factor
      const confidence = sameEntity ? Math.max(0.8, similarity) : similarity
      if ((sameEntity || similarity >= CLUSTERING.summarySimilarityThreshold) && (!best || confidence > best.confidence)) {
        best = { candidate: c, confidence }
      }
    }

    let eventId: string
    if (best) {
      eventId = best.candidate.id
      attached++
      await query(`UPDATE events SET last_seen_at = now(), updated_at = now() WHERE id = $1`, [eventId])
    } else {
      eventId = newId()
      newEvents++
      await query(
        `INSERT INTO events (id, title, description, event_date, category, company, event_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [eventId, p.title, p.summary, dateInZone(new Date(p.published_at), SCORE_TIMEZONE), p.factor, p.entities?.company ?? null, p.event_type]
      )
      candidates.push({ id: eventId, category: p.factor, company, eventType: p.event_type, tokens: t })
    }
    await query(
      `INSERT INTO event_articles (event_id, article_id, confidence) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [eventId, p.id, best ? Math.round(best.confidence * 100) / 100 : 1]
    )
  }
  return { newEvents, attached }
}
