import { createHash } from 'node:crypto'

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|ref_src$|cmpid$|source$)/i

// Stage 1: protocol, host case, trailing slash, tracking params, fragments.
export function canonicalizeUrl(raw: string): string | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  u.protocol = 'https:'
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '')
  u.hash = ''
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) u.searchParams.delete(key)
  }
  u.searchParams.sort()
  u.pathname = u.pathname.replace(/\/+$/, '') || '/'
  return u.toString()
}

export const hashUrl = (canonicalUrl: string) => createHash('sha1').update(canonicalUrl).digest('hex')

// Stage 2: case, punctuation and whitespace.
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOPWORDS = new Set(
  'a an the and or of to in on for with at by from as is are was were be been its it this that has have had will new says said after over into about'.split(' ')
)

export function tokens(text: string): Set<string> {
  return new Set(normalizeTitle(text).split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t)))
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / (a.size + b.size - shared)
}
