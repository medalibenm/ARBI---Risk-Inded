// Every tunable constant of the ABRI pipeline lives here.
// Values marked GUESS resolve an item from the SOP's open-decision index and
// were chosen by default, not confirmed against real data — tune freely.

export type Factor = 'funding' | 'valuation' | 'sentiment' | 'infrastructure' | 'correction'
export type PersistenceClass = 'transient' | 'structural' | 'landmark'

export const FACTORS: Factor[] = ['funding', 'valuation', 'sentiment', 'infrastructure', 'correction']

export const FACTOR_LABELS: Record<Factor, string> = {
  funding: 'Funding',
  valuation: 'Valuations',
  sentiment: 'Sentiment',
  infrastructure: 'Infrastructure',
  correction: 'Correction signals',
}

// ── AI models (OpenRouter) ─────────────────────────────────────────────
export const MODELS = {
  extraction: process.env.EXTRACTION_MODEL || 'typesafe/jev-1.13',
  interpretation: process.env.INTERPRETATION_MODEL || 'openai/o4-mini',
  fallback: process.env.FALLBACK_MODEL || 'deepseek/deepseek-v4.1-flash',
}

// ── Schedule ───────────────────────────────────────────────────────────
// The score day is the calendar date in this timezone. Cron itself runs in
// UTC (see vercel.json).
export const SCORE_TIMEZONE = process.env.SCORE_UPDATE_TIMEZONE || 'America/New_York'

// ── RSS sources ────────────────────────────────────────────────────────
export type FeedSeed = { id: string; name: string; domain: string; tier: number; rssUrl: string }

export const FEEDS: FeedSeed[] = [
  { id: 'openai', name: 'OpenAI News', domain: 'openai.com', tier: 1, rssUrl: 'https://openai.com/news/rss.xml' },
  { id: 'deepmind', name: 'Google DeepMind', domain: 'deepmind.google', tier: 1, rssUrl: 'https://deepmind.google/blog/rss.xml' },
  { id: 'google-ai', name: 'Google AI', domain: 'blog.google', tier: 1, rssUrl: 'https://blog.google/innovation-and-ai/technology/ai/rss/' },
  { id: 'nvidia-press', name: 'NVIDIA Newsroom', domain: 'nvidianews.nvidia.com', tier: 1, rssUrl: 'https://nvidianews.nvidia.com/releases.xml' },
  { id: 'nvidia-blog', name: 'NVIDIA Blog', domain: 'blogs.nvidia.com', tier: 1, rssUrl: 'https://blogs.nvidia.com/feed/' },
  { id: 'microsoft-research', name: 'Microsoft Research', domain: 'microsoft.com', tier: 1, rssUrl: 'https://www.microsoft.com/en-us/research/feed/' },
  { id: 'mistral', name: 'Mistral AI', domain: 'mistral.ai', tier: 1, rssUrl: 'https://mistral.ai/news/rss' },
  { id: 'aws-ml', name: 'AWS Machine Learning Blog', domain: 'aws.amazon.com', tier: 1, rssUrl: 'https://aws.amazon.com/blogs/machine-learning/feed/' },
  { id: 'mit-ai', name: 'MIT News — AI', domain: 'news.mit.edu', tier: 2, rssUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2' },
  { id: 'mit-cs', name: 'MIT News — Computing', domain: 'news.mit.edu', tier: 2, rssUrl: 'https://news.mit.edu/rss/topic/computers' },
  { id: 'wired-ai', name: 'WIRED AI', domain: 'wired.com', tier: 2, rssUrl: 'https://www.wired.com/feed/tag/ai/latest/rss' },
  { id: 'wired-business', name: 'WIRED Business', domain: 'wired.com', tier: 2, rssUrl: 'https://www.wired.com/feed/category/business/latest/rss' },
  { id: 'ars-technica', name: 'Ars Technica', domain: 'arstechnica.com', tier: 2, rssUrl: 'https://arstechnica.com/feed/' },
  { id: 'techcrunch', name: 'TechCrunch', domain: 'techcrunch.com', tier: 3, rssUrl: 'https://techcrunch.com/feed/' },
  { id: 'venturebeat', name: 'VentureBeat', domain: 'venturebeat.com', tier: 3, rssUrl: 'https://feeds.feedburner.com/venturebeat/SZYF' },
]

// GUESS — source weighting formula (tier → numeric weight).
export const TIER_WEIGHT: Record<number, number> = { 1: 1.0, 2: 0.85, 3: 0.7, 4: 0.5, 5: 0.3 }

// ── Retrieval / filtering (GUESS) ──────────────────────────────────────
export const RETRIEVAL = {
  maxArticleAgeHours: 72, // older RSS items are ignored
  titleSimilarityThreshold: 0.85, // token Jaccard above this = duplicate title
  maxExtractionsPerRun: 120, // cost guard on the per-article model
  extractionConcurrency: 6,
  maxExtractionAttempts: 3,
  articleTextChars: 6000, // how much of the page body the extractor sees
  minRelevanceProbability: 0.3, // extractor's probability gate into clustering
}

// ── Event clustering (GUESS) ───────────────────────────────────────────
export const CLUSTERING = {
  windowHours: 96, // an article can join an event first seen within this window
  summarySimilarityThreshold: 0.45, // token Jaccard on extractor summaries
  maxEventsForInterpretation: 30, // evidence package size cap
}

// ── Scoring (ABRI_SCORING_METHODOLOGY.md) ──────────────────────────────
// Option 2: heat weights rescaled to sum to 1, correction is a separate penalty.
export const HEAT_WEIGHTS: Record<Exclude<Factor, 'correction'>, number> = {
  funding: 0.28,
  valuation: 0.28,
  sentiment: 0.22,
  infrastructure: 0.22,
}
export const CORRECTION_WEIGHT = 0.15

// Decay anchors [ageDays, multiplier] from the methodology §4.
// GUESS: linear interpolation between anchors, reaching 0 at 21 days.
export const DECAY_ANCHORS: [number, number][] = [
  [0, 1.0],
  [1, 0.9],
  [2, 0.8],
  [3, 0.7],
  [7, 0.4],
  [14, 0.15],
  [21, 0],
]
export const PERSISTENCE_FLOOR: Record<PersistenceClass, number> = {
  transient: 0,
  structural: 0.25,
  landmark: 0.55,
}

export const SCORING = {
  // GUESS: points a factor moves per unit of signal weight. A magnitude-10,
  // tier-1, fully confident, same-day signal moves its factor by this much.
  sensitivity: 6,
  // GUESS: max points one factor can move in a single day.
  maxDailyFactorMove: 12,
  // GUESS: flag a factor as "pulled both ways" when |net| / gross is below this.
  dispersionThreshold: 0.3,
}

// GUESS — day-1 bootstrap: factor scores assumed before any history exists.
// Sparse/missing-data days hold the previous value flat (no drift to neutral).
export const BOOTSTRAP_FACTORS: Record<Factor, number> = {
  funding: 70,
  valuation: 75,
  sentiment: 70,
  infrastructure: 80,
  correction: 35,
}

// Status bands, methodology §6. [minScore, status]
export const STATUS_BANDS: [number, string][] = [
  [85, 'VERY_HOT'],
  [70, 'HOT'],
  [50, 'ELEVATED'],
  [30, 'WARM'],
  [0, 'COLD'],
]
