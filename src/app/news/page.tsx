import type { Metadata } from 'next'
import NewsList from '../../components/NewsList'
import SectionHeading from '../../components/SectionHeading'
import { FACTOR_LABELS, SCORE_TIMEZONE } from '../../lib/config'
import { getNews } from '../../lib/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'News',
  description: 'The AI-market news behind the AI Bubble Risk Index, with how each story moved the score.',
  alternates: { canonical: '/news' },
}

const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SCORE_TIMEZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
})

export default async function NewsPage() {
  const news = await getNews()
  const items = news.map((n) => ({
    ...n,
    factorLabel: FACTOR_LABELS[n.factor],
    publishedLabel: timeFormat.format(new Date(n.publishedAt)),
    // "up" on a heat factor heats the index; "up" on correction cools it
    heats: (n.direction === 'up') !== (n.factor === 'correction'),
  }))

  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-10 sm:px-8">
      <SectionHeading as="h1" className="!text-sm sm:!text-base">WHAT MOVED ABRI</SectionHeading>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
        AI-market stories from the past 7 days and how each one affected the index. Headlines link to the original publisher.
      </p>
      <NewsList items={items} />
    </section>
  )
}
