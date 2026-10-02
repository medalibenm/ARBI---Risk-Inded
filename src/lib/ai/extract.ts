import { FACTORS, MODELS, RETRIEVAL, type Factor } from '../config'
import { stripHtml, USER_AGENT } from '../news/rss'
import { callDecisions, callJson, type DecisionQuestion, type JsonResult } from './openrouter'

export const EVENT_TYPES = [
  'funding_round', 'acquisition', 'ipo', 'valuation_change', 'earnings', 'infrastructure_investment',
  'product_launch', 'partnership', 'layoffs', 'shutdown', 'regulation', 'market_commentary', 'research', 'other',
] as const

export type ArticleExtraction = {
  relevant: boolean
  relevance_probability: number
  factor: Factor | null
  direction: 'up' | 'down' | null
  magnitude_estimate: number
  event_type: (typeof EVENT_TYPES)[number]
  entities: { company: string | null; amount_usd: number | null }
  summary: string
}

export type ExtractionInput = {
  id: string
  title: string
  url: string
  description: string | null
  sourceName: string
  sourceTier: number
  publishedAt: Date
}

export interface ExtractionAIProvider {
  extract(article: ExtractionInput): Promise<JsonResult<ArticleExtraction>>
}

const SYSTEM = `You extract structured evidence for ABRI, the AI Bubble Risk Index: a daily 0-100 measure of how overheated the AI market is.

ABRI tracks five factors:
- funding: AI startup funding rounds, mega-rounds, VC activity, IPOs, M&A.
- valuation: startup valuations, public AI company multiples, revenue vs valuation.
- sentiment: investor and market mood about AI — hype, enthusiasm, bubble talk, skepticism.
- infrastructure: GPU demand, hyperscaler capex, data-center and power build-out.
- correction: signs of cooling — layoffs, failed startups, disappointing earnings, falling valuations, cancelled projects, reduced capex, investor caution.

For the one article given:
- relevance_probability: probability (0-1) that this article is a real signal for one of the five factors. Product how-tos, model releases with no market angle, pure research, and generic commentary are low (<0.3).
- relevant: true only when relevance_probability >= 0.3.
- factor: the single best-fitting factor, or "none".
- direction: "up" if the article means MORE of that factor (more funding, higher valuations, more hype, more spending, more correction activity), "down" if less, "none" if not relevant.
- magnitude_estimate: 0-10. 1-3 routine, 4-6 notable, 7-8 major, 9-10 market-defining. 0 if not relevant.
- event_type: the closest category.
- entities.company: the main company involved, as its common short name (e.g. "OpenAI"), or null.
- entities.amount_usd: the headline dollar amount as a plain number, or null.
- summary: one or two factual sentences in your own words. Do not copy the article's phrasing. State only what the article reports.

Report facts only. Do not estimate or mention any ABRI score.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['relevant', 'relevance_probability', 'factor', 'direction', 'magnitude_estimate', 'event_type', 'entities', 'summary'],
  properties: {
    relevant: { type: 'boolean' },
    relevance_probability: { type: 'number' },
    factor: { type: 'string', enum: [...FACTORS, 'none'] },
    direction: { type: 'string', enum: ['up', 'down', 'none'] },
    magnitude_estimate: { type: 'integer' },
    event_type: { type: 'string', enum: [...EVENT_TYPES] },
    entities: {
      type: 'object',
      additionalProperties: false,
      required: ['company', 'amount_usd'],
      properties: {
        company: { type: ['string', 'null'] },
        amount_usd: { type: ['number', 'null'] },
      },
    },
    summary: { type: 'string' },
  },
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function validate(raw: any): ArticleExtraction {
  if (!raw || typeof raw !== 'object' || typeof raw.summary !== 'string') throw new Error('extraction: bad shape')
  const probability = clamp(Number(raw.relevance_probability), 0, 1)
  if (Number.isNaN(probability)) throw new Error('extraction: bad relevance_probability')
  const factor = FACTORS.includes(raw.factor) ? (raw.factor as Factor) : null
  const direction = raw.direction === 'up' || raw.direction === 'down' ? raw.direction : null
  const amount = Number(raw.entities?.amount_usd)
  return {
    // the probability gate is applied here, not trusted from the model's boolean
    relevant: probability >= RETRIEVAL.minRelevanceProbability && factor !== null && direction !== null,
    relevance_probability: probability,
    factor,
    direction,
    magnitude_estimate: clamp(Math.round(Number(raw.magnitude_estimate) || 0), 0, 10),
    event_type: EVENT_TYPES.includes(raw.event_type) ? raw.event_type : 'other',
    entities: {
      company: typeof raw.entities?.company === 'string' && raw.entities.company.trim() ? raw.entities.company.trim() : null,
      amount_usd: Number.isFinite(amount) && amount > 0 ? amount : null,
    },
    summary: raw.summary.trim().slice(0, 600),
  }
}

// Blueprint §18 step 5. The text is used for extraction only and never stored.
async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null
    const html = await res.text()
    const body = html.match(/<article[\s\S]*<\/article>/i)?.[0] ?? html.match(/<main[\s\S]*<\/main>/i)?.[0] ?? html
    const text = stripHtml(body)
    return text.length > 200 ? text.slice(0, RETRIEVAL.articleTextChars) : null
  } catch {
    return null
  }
}

// ── Jev (decision model) ───────────────────────────────────────────────
// Jev answers typed questions with probabilities; it writes no text, so a Jev
// extraction has no summary or entities — those stay null and downstream code
// falls back to the article's title and RSS description.

const FACTOR_CRITERIA: Record<Factor, string> = {
  funding: 'AI startup funding rounds, mega-rounds, venture capital activity, IPOs, or M&A.',
  valuation: 'Company valuations, public AI stock multiples, market caps, or revenue versus valuation.',
  sentiment: 'Investor or market mood about AI: hype, enthusiasm, bubble talk, or skepticism.',
  infrastructure: 'GPU demand, hyperscaler capex, data-center construction, chips, or power for AI.',
  correction: 'Signs of cooling: layoffs, failed startups, weak earnings, falling valuations, cancelled projects, reduced spending, investor caution.',
}

const MAGNITUDE_LEVELS = [
  'Routine: minor or everyday news with little market weight.',
  'Notable: a meaningful development, e.g. a nine-figure round or a significant company announcement.',
  'Major: a multi-billion-dollar or industry-shaping development.',
  'Market-defining: one of the largest AI market events of the year.',
]

const JEV_QUESTIONS: Record<string, DecisionQuestion> = {
  relevant: {
    type: 'noul',
    instructions:
      'Is this article a real signal about AI-market bubble conditions (funding, valuations, investor sentiment, infrastructure spending, or correction signs)?',
    criteria: {
      true: 'It reports a concrete market, money, spending, valuation, sentiment, or cooling development in the AI industry.',
      false: 'It is a product how-to, a model or feature release with no market angle, pure research, or generic commentary.',
    },
  },
  factor: { type: 'choice', instructions: 'Which single factor does this article mainly inform?', criteria: FACTOR_CRITERIA },
  direction: {
    type: 'choice',
    instructions: 'Does the article report more or less of that factor?',
    criteria: {
      up: 'More: more funding, higher valuations, more hype, more infrastructure spending, or more correction activity.',
      down: 'Less: funding drying up, valuations falling, fading enthusiasm, spending cut back, or correction activity easing.',
    },
  },
  magnitude: { type: 'score', instructions: 'How large is this development for the AI market as a whole?', criteria: MAGNITUDE_LEVELS },
  event_type: {
    type: 'choice',
    instructions: 'What kind of event does the article report?',
    criteria: {
      funding_round: 'A company raising money.',
      acquisition: 'A merger or acquisition.',
      ipo: 'A public listing or IPO plan.',
      valuation_change: 'A change in a company valuation or share price.',
      earnings: 'Financial results or revenue figures.',
      infrastructure_investment: 'Spending on data centers, chips, compute, or power.',
      product_launch: 'A product, model, or feature release.',
      partnership: 'A commercial deal or partnership.',
      layoffs: 'Job cuts.',
      shutdown: 'A company or project closing or being cancelled.',
      regulation: 'Government, legal, or regulatory action.',
      market_commentary: 'Analysis or opinion about the AI market.',
      research: 'Scientific or technical research.',
      other: 'None of the above.',
    },
  },
}

async function extractWithJev(article: ExtractionInput, body: string): Promise<JsonResult<ArticleExtraction>> {
  const { data: a, model, cost } = await callDecisions(
    MODELS.extraction,
    { source: article.sourceName, source_tier: article.sourceTier, published: article.publishedAt.toISOString(), title: article.title, article: body },
    JEV_QUESTIONS
  )
  if (typeof a.relevant?.noul !== 'number') throw new Error('jev: missing relevance answer')
  const levels = MAGNITUDE_LEVELS.length - 1
  return {
    model,
    cost,
    data: validate({
      relevance_probability: a.relevant.noul,
      factor: a.factor?.choice,
      direction: a.direction?.choice,
      // expected level 0..3 → magnitude 1..10
      magnitude_estimate: 1 + (clamp(Number(a.magnitude?.score) || 0, 0, levels) / levels) * 9,
      event_type: a.event_type?.choice,
      entities: { company: null, amount_usd: null },
      summary: '',
    }),
  }
}

export const jevExtractor: ExtractionAIProvider = {
  async extract(article) {
    const body = (await fetchArticleText(article.url)) ?? article.description ?? '(no body available — judge from the title)'
    if (MODELS.extraction.startsWith('typesafe/')) {
      try {
        return await extractWithJev(article, body)
      } catch (err) {
        console.error(`jev failed for ${article.id}, using fallback:`, (err as Error).message)
      }
    }
    return callJson(
      {
        model: MODELS.extraction.startsWith('typesafe/') ? MODELS.fallback : MODELS.extraction,
        system: SYSTEM,
        user: [
          `Source: ${article.sourceName} (tier ${article.sourceTier})`,
          `Published: ${article.publishedAt.toISOString()}`,
          `Title: ${article.title}`,
          '',
          body,
        ].join('\n'),
        schemaName: 'article_extraction',
        schema: SCHEMA,
        maxTokens: 2000,
      },
      validate
    )
  },
}
