// Rule-based relevance filter — runs before any paid model call.
// An article passes when it is about AI at all; factor keywords only rank it, so
// the strongest candidates are extracted first when the per-run cap is hit. The
// real relevance call is the extractor's probability — it costs a fraction of a
// cent per hundred articles, so the rules only need to drop the clearly off-topic.
// GUESS: the keyword lists.

const AI_TERMS =
  /\b(ai|a\.i\.|artificial intelligence|machine learning|generative|genai|llms?|large language models?|chatbots?|openai|anthropic|claude|chatgpt|gemini|deepmind|mistral|xai|grok|nvidia|gpus?|copilot|hugging ?face|perplexity|deepseek|foundation models?|agentic|ai agents?|data ?cent(er|re)s?|hyperscalers?|compute)\b/i

const FACTOR_TERMS: RegExp[] = [
  // funding
  /\b(raises?|raised|funding|round|series [a-h]|seed|venture|vcs?|investors?|invest(s|ed|ing|ment)?|backed|ipo|acqui(re|res|red|sition)|merger|buyout|stake|capital)\b/i,
  // valuation
  /\b(valuations?|valued|worth|market cap|multiples?|revenue|earnings|profits?|shares?|stocks?|trillion|billion|\$\d)/i,
  // sentiment
  /\b(bubble|hype|frenzy|boom|mania|overheat(ed|ing)?|optimis(m|tic)|bullish|bearish|skeptic(s|al|ism)?|euphori[ac]|speculat(ive|ion)|fomo)\b/i,
  // infrastructure
  /\b(data ?cent(er|re)s?|capex|capital expenditure|gigawatts?|megawatts?|chips?|semiconductors?|gpus?|supercomputers?|infrastructure|hyperscalers?|power (deal|supply|grid)|build-?out)\b/i,
  // correction
  /\b(layoffs?|lay(s|ing)? off|job cuts?|cuts? (jobs|staff|spending)|shut(s|ting)? down|shutdown|bankrupt(cy)?|write-?downs?|down round|slump|sell-?off|plunge[sd]?|decline[sd]?|slowdown|cancel(s|led|ed)?|pause[sd]?|delay(s|ed)?|miss(es|ed)? (estimates|expectations)|lawsuit|antitrust|probe|crackdown)\b/i,
]

export function ruleScore(title: string, description = ''): number {
  const text = `${title} ${description}`
  if (!AI_TERMS.test(text)) return 0
  const factorHits = FACTOR_TERMS.filter((re) => re.test(text)).length
  // A factor term in the headline itself is a stronger signal than one in the blurb.
  const titleHits = FACTOR_TERMS.filter((re) => re.test(title)).length
  return 1 + factorHits + titleHits
}
