import { XMLParser } from 'fast-xml-parser'
import type { FeedSeed } from '../config'
import { canonicalizeUrl, hashUrl, normalizeTitle } from './dedup'

export type NewsArticle = {
  id: string
  title: string
  titleNorm: string
  url: string
  canonicalUrl: string
  sourceId: string
  sourceName: string
  sourceDomain: string
  sourceTier: number
  author?: string
  publishedAt: Date
  description?: string
  retrievalMethod: 'rss'
  externalId?: string
  deduplicationHash: string
}

export interface RssProvider {
  fetchFeed(feed: FeedSeed): Promise<NewsArticle[]>
}

export const USER_AGENT = 'Mozilla/5.0 (compatible; ABRI-bot/0.1; +https://github.com/medalibenm)'

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true })

const text = (v: any): string => {
  if (v == null) return ''
  if (typeof v === 'object') return text(v['#text'] ?? v['@_href'] ?? '')
  return String(v)
}

export const stripHtml = (html: string) =>
  html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function atomLink(link: any): string {
  const links = Array.isArray(link) ? link : [link]
  const alt = links.find((l) => typeof l === 'object' && (l['@_rel'] ?? 'alternate') === 'alternate') ?? links[0]
  return text(alt)
}

export const genericRss: RssProvider = {
  async fetchFeed(feed) {
    const res = await fetch(feed.rssUrl, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const doc = parser.parse(await res.text())

    const rssItems = doc?.rss?.channel?.item ?? doc?.['rdf:RDF']?.item
    const atomEntries = doc?.feed?.entry
    const raw: any[] = [rssItems ?? atomEntries ?? []].flat()
    if (!rssItems && !atomEntries) throw new Error('not an RSS/Atom feed')

    const articles: NewsArticle[] = []
    for (const item of raw) {
      const title = stripHtml(text(item.title))
      const url = atomEntries ? atomLink(item.link) : text(item.link) || text(item.guid)
      const canonicalUrl = canonicalizeUrl(url)
      const publishedAt = new Date(text(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']))
      if (!title || !canonicalUrl || Number.isNaN(publishedAt.getTime())) continue

      const hash = hashUrl(canonicalUrl)
      articles.push({
        id: hash.slice(0, 16),
        title,
        titleNorm: normalizeTitle(title),
        url: canonicalUrl,
        canonicalUrl,
        sourceId: feed.id,
        sourceName: feed.name,
        sourceDomain: feed.domain,
        sourceTier: feed.tier,
        author: text(item['dc:creator'] ?? item.author?.name ?? item.author) || undefined,
        publishedAt,
        description: stripHtml(text(item.description ?? item.summary ?? '')).slice(0, 600) || undefined,
        retrievalMethod: 'rss',
        externalId: text(item.guid ?? item.id) || undefined,
        deduplicationHash: hash,
      })
    }
    return articles
  },
}
