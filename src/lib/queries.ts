import { FACTORS, type Factor } from './config'
import { query } from './db'

// Read-side queries for the public pages.

export type IndexData = {
  date: string
  score: number
  change: number | null
  status: string
  summary: string | null
  factors: { key: Factor; name: string; score: number; impact: number; description: string | null }[]
  history: { date: string; value: number }[]
}

export async function getIndexData(): Promise<IndexData | null> {
  const [latest] = await query(`SELECT * FROM daily_scores ORDER BY date DESC LIMIT 1`)
  if (!latest) return null
  const factorRows = await query(`SELECT * FROM score_factors WHERE daily_score_id = $1`, [latest.id])
  const history = await query(`SELECT date, score FROM daily_scores ORDER BY date DESC LIMIT 30`)
  return {
    date: latest.date,
    score: latest.score,
    change: latest.change,
    status: latest.status,
    summary: latest.summary,
    factors: FACTORS.flatMap((key) => {
      const r = factorRows.find((f) => f.category === key)
      return r ? [{ key, name: r.name, score: Number(r.score), impact: Number(r.impact), description: r.description }] : []
    }),
    history: history.reverse().map((h) => ({ date: h.date, value: h.score })),
  }
}

export type NewsItem = {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  factor: Factor
  direction: 'up' | 'down'
  magnitude: number
  contribution: number | null
  explanation: string | null
  scored: boolean // the daily run has reviewed this article's event
  hasSignal: boolean // ...and judged it a signal
}

// Relevant articles from the last 7 days. Once the daily run has interpreted an
// article's event, its impact comes from that signal; before that, from the
// extractor's own reading.
export async function getNews(): Promise<NewsItem[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const rows = await query(
    `SELECT a.id, a.title, a.url, a.published_at, s.name AS source,
            x.factor AS x_factor, x.direction AS x_direction, x.magnitude_estimate, x.summary,
            sig.factor AS s_factor, sig.direction AS s_direction, sig.magnitude AS s_magnitude,
            sig.explanation, dss.contribution, e.status AS event_status
       FROM news_articles a
       JOIN news_sources s ON s.id = a.source_id
       JOIN article_extractions x ON x.article_id = a.id AND x.relevant
       LEFT JOIN event_articles ea ON ea.article_id = a.id
       LEFT JOIN events e ON e.id = ea.event_id
       LEFT JOIN news_signals sig ON sig.event_id = ea.event_id
       LEFT JOIN daily_score_signals dss ON dss.signal_id = sig.id
      WHERE a.published_at >= $1
      ORDER BY a.published_at DESC
      LIMIT 200`,
    [since]
  )
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    source: r.source,
    publishedAt: new Date(r.published_at).toISOString(),
    factor: r.s_factor ?? r.x_factor,
    direction: r.s_direction ?? r.x_direction,
    magnitude: r.s_magnitude ?? r.magnitude_estimate,
    contribution: r.contribution == null ? null : Number(r.contribution),
    explanation: r.explanation || r.summary || null,
    scored: r.event_status === 'scored',
    hasSignal: r.s_factor != null,
  }))
}
