// Local pipeline runner: npm run pipeline:poll | pipeline:daily | pipeline:status | pipeline:log
import { writeFileSync } from 'node:fs'
import { query } from '../src/lib/db'
import { runDailyUpdate } from '../src/lib/jobs/daily'
import { pollFeeds } from '../src/lib/news/poll'

const command = process.argv[2]

// Every stored article, with the extractor's decision where one was made.
// Prints the decided articles and writes the full list to a CSV.
async function decisionLog() {
  const rows = await query(
    `SELECT a.published_at, s.name AS source, a.title, a.status, a.url,
            x.relevance_probability AS probability, x.relevant, x.factor, x.direction,
            x.magnitude_estimate AS magnitude, x.event_type, x.model
       FROM news_articles a
       JOIN news_sources s ON s.id = a.source_id
       LEFT JOIN article_extractions x ON x.article_id = a.id
      ORDER BY x.relevance_probability DESC NULLS LAST, a.published_at DESC`
  )
  const cols = ['published_at', 'source', 'title', 'status', 'probability', 'relevant', 'factor', 'direction', 'magnitude', 'event_type', 'model', 'url']
  const cell = (v: unknown) => {
    const t = v instanceof Date ? v.toISOString() : v == null ? '' : String(v)
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const file = '.data/jev-decisions.csv'
  writeFileSync(file, [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n')

  const decided = rows.filter((r) => r.probability != null)
  console.table(
    decided.map((r) => ({
      p: Number(r.probability).toFixed(2),
      kept: r.relevant ? 'yes' : 'no',
      factor: r.factor,
      dir: r.direction,
      mag: r.magnitude,
      type: r.event_type,
      source: r.source,
      title: r.title.slice(0, 60),
    }))
  )
  console.log(`${rows.length} articles: ${decided.length} decided by the extractor, ${rows.length - decided.length} dropped by the rule filter first.`)
  console.log(`Full log: ${file}`)

  await frontierLog()
}

// What the latest daily run sent to the interpretation model and what it answered.
async function frontierLog() {
  const [run] = await query(
    `SELECT score_date, interpretation_model, interpretation_input, interpretation_output
       FROM pipeline_runs WHERE kind = 'daily' AND status <> 'failed' ORDER BY started_at DESC LIMIT 1`
  )
  console.log('\n── Frontier model, latest daily run ──')
  if (!run) return console.log('No daily run yet.')
  if (!run.interpretation_input) {
    return console.log(`${run.score_date}: this run predates input/output logging; the next daily run will be recorded.`)
  }

  const input = run.interpretation_input
  const output = run.interpretation_output
  console.log(`${run.score_date} · model: ${run.interpretation_model} · ${input.events.length} events sent, ${output.signals.length} signals returned`)
  for (const e of input.events) {
    const s = output.signals.find((sig: any) => sig.event_id === e.event_id)
    console.log(`\n• ${e.title}`)
    console.log(`  sources: ${e.sources.join(', ')} (best tier ${e.best_source_tier}) · extractor guessed: ${e.factor_hint}`)
    console.log(
      s
        ? `  → ${s.factor} ${s.direction}, magnitude ${s.magnitude}, confidence ${s.confidence}, ${s.persistence_class}\n    ${s.reason}`
        : '  → no signal (model judged it not to move any factor)'
    )
  }
  console.log(`\nSummary: ${output.summary}`)
  if (output.uncertainties.length) console.log(`Uncertainties:\n  - ${output.uncertainties.join('\n  - ')}`)

  const file = `.data/frontier-${run.score_date}.json`
  writeFileSync(file, JSON.stringify({ model: run.interpretation_model, input, output }, null, 2))
  console.log(`Full input/output: ${file}`)
}

async function main() {
  if (command === 'poll') {
    console.log(await pollFeeds())
  } else if (command === 'daily') {
    console.log(await runDailyUpdate())
  } else if (command === 'status') {
    console.table(await query(`SELECT status, COUNT(*)::int AS articles FROM news_articles GROUP BY status`))
    console.table(await query(`SELECT date, score, change, status FROM daily_scores ORDER BY date DESC LIMIT 7`))
    console.table(
      await query(
        `SELECT kind, score_date, status, rss_results_count AS rss, relevant_articles_count AS relevant,
                extraction_calls_count AS extractions, extraction_cost_estimate AS extract_cost,
                unique_events_count AS events, interpretation_cost_estimate AS interpret_cost, error_message
           FROM pipeline_runs ORDER BY started_at DESC LIMIT 5`
      )
    )
  } else if (command === 'log') {
    await decisionLog()
  } else {
    console.error('usage: run.ts poll | daily | status | log')
    process.exit(1)
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err)
    process.exit(1)
  }
)
