import { FEEDS, RETRIEVAL } from '../config'
import { newId, query } from '../db'
import { jaccard, tokens } from './dedup'
import { ruleScore } from './relevance'
import { genericRss, type NewsArticle } from './rss'

export type PollResult = {
  rssResults: number
  uniqueArticles: number
  relevantArticles: number
  failedSources: { source: string; error: string }[]
}

// Blueprint §18 steps 1–4: poll → normalize → URL/title dedup → rule filter → store.
// A single feed failing never stops the run.
export async function pollFeeds(): Promise<PollResult> {
  const runId = newId()
  await query(`INSERT INTO pipeline_runs (id, kind) VALUES ($1, 'poll')`, [runId])

  const settled = await Promise.allSettled(FEEDS.map((f) => genericRss.fetchFeed(f)))
  const failedSources: PollResult['failedSources'] = []
  const fetched: NewsArticle[] = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') fetched.push(...r.value)
    else failedSources.push({ source: FEEDS[i].id, error: String(r.reason?.message ?? r.reason) })
  })

  const cutoff = Date.now() - RETRIEVAL.maxArticleAgeHours * 3_600_000
  const recent = fetched
    .filter((a) => a.publishedAt.getTime() >= cutoff && a.publishedAt.getTime() <= Date.now() + 3_600_000)
    // highest tier first, so the best source wins when two titles collide
    .sort((a, b) => a.sourceTier - b.sourceTier || a.publishedAt.getTime() - b.publishedAt.getTime())

  // Stage 1 — URL
  const known = new Set(
    recent.length
      ? (
          await query(`SELECT deduplication_hash FROM news_articles WHERE deduplication_hash = ANY($1)`, [
            recent.map((a) => a.deduplicationHash),
          ])
        ).map((r) => r.deduplication_hash)
      : []
  )

  // Stage 2 — title, against everything stored in the retrieval window
  const seenTitles = (
    await query(`SELECT title_norm FROM news_articles WHERE published_at >= $1`, [new Date(cutoff).toISOString()])
  ).map((r) => ({ norm: r.title_norm as string, tokens: tokens(r.title_norm) }))

  let unique = 0
  let relevant = 0
  for (const a of recent) {
    if (known.has(a.deduplicationHash)) continue
    known.add(a.deduplicationHash)

    const t = tokens(a.titleNorm)
    const duplicateTitle = seenTitles.some(
      (s) => s.norm === a.titleNorm || jaccard(s.tokens, t) >= RETRIEVAL.titleSimilarityThreshold
    )
    if (duplicateTitle) continue
    seenTitles.push({ norm: a.titleNorm, tokens: t })
    unique++

    const score = ruleScore(a.title, a.description)
    if (score > 0) relevant++
    await query(
      `INSERT INTO news_articles
         (id, source_id, title, title_norm, url, canonical_url, description, author, published_at,
          retrieval_method, external_id, deduplication_hash, rule_score, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT DO NOTHING`,
      [
        a.id, a.sourceId, a.title, a.titleNorm, a.url, a.canonicalUrl, a.description ?? null, a.author ?? null,
        a.publishedAt.toISOString(), a.retrievalMethod, a.externalId ?? null, a.deduplicationHash, score,
        score > 0 ? 'pending' : 'filtered',
      ]
    )
  }

  const result = { rssResults: fetched.length, uniqueArticles: unique, relevantArticles: relevant, failedSources }
  await query(
    `UPDATE pipeline_runs SET completed_at = now(), status = $2, rss_results_count = $3,
       unique_articles_count = $4, relevant_articles_count = $5, failed_sources = $6::jsonb WHERE id = $1`,
    [runId, failedSources.length ? 'degraded' : 'ok', fetched.length, unique, relevant, JSON.stringify(failedSources)]
  )
  return result
}
