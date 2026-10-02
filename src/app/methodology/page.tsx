import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import SectionHeading from '../../components/SectionHeading'
import { CORRECTION_WEIGHT, DECAY_ANCHORS, FEEDS, HEAT_WEIGHTS, STATUS_BANDS } from '../../lib/config'

export const metadata: Metadata = {
  title: 'Methodology',
  description: 'How the AI Bubble Risk Index is calculated: the five factors, the formula, the news pipeline, and its limits.',
  alternates: { canonical: '/methodology' },
}

const pct = (n: number) => `${Math.round(n * 100)}%`

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  )
}

export default function MethodologyPage() {
  const sources = [...new Set(FEEDS.map((f) => f.name.split(' — ')[0]))].join(', ')
  const bands = [...STATUS_BANDS].reverse()

  return (
    <article className="mx-auto max-w-3xl px-6 pb-20 pt-10 sm:px-8">
      <SectionHeading as="h1" className="!text-sm sm:!text-base">METHODOLOGY</SectionHeading>

      <Block title="What ABRI measures">
        <p>
          ABRI is a daily 0–100 reading of bubble conditions in the AI market. A higher number means more signs of
          speculative overheating. It measures conditions, not timing: it does not predict when or whether a correction
          will happen.
        </p>
      </Block>

      <Block title="The five factors">
        <p>Each factor is scored 0–100. Four of them add heat; the fifth subtracts it.</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Funding ({pct(HEAT_WEIGHTS.funding)})</strong> — funding rounds, venture activity, IPOs, M&amp;A.</li>
          <li><strong>Valuations ({pct(HEAT_WEIGHTS.valuation)})</strong> — startup valuations and public AI company multiples.</li>
          <li><strong>Sentiment ({pct(HEAT_WEIGHTS.sentiment)})</strong> — investor enthusiasm, hype, and skepticism.</li>
          <li><strong>Infrastructure ({pct(HEAT_WEIGHTS.infrastructure)})</strong> — GPU demand, data centers, hyperscaler capex.</li>
          <li><strong>Correction signals (penalty)</strong> — layoffs, failed startups, weak earnings, cancelled projects, reduced spending.</li>
        </ul>
      </Block>

      <Block title="The formula">
        <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-card-foreground">
{`Heat = Funding × ${HEAT_WEIGHTS.funding} + Valuations × ${HEAT_WEIGHTS.valuation}
     + Sentiment × ${HEAT_WEIGHTS.sentiment} + Infrastructure × ${HEAT_WEIGHTS.infrastructure}

ABRI = Heat − Correction × ${CORRECTION_WEIGHT}     (rounded, kept within 0–100)`}
        </pre>
        <p>
          The arithmetic is fixed code. AI models read and classify the news, but they never choose the ABRI number.
          Every stored score keeps the signals and factor values it was computed from.
        </p>
      </Block>

      <Block title="From news to signals">
        <p>
          Several times a day ABRI reads the public feeds of {sources}. Duplicate stories are removed, and each remaining
          AI-related article is classified: how likely it is to be a real market signal, which factor it informs, in
          which direction, and how large it is. Articles about the same event are grouped so one event counts once.
        </p>
        <p>
          Once a day, a reasoning model reviews the day&apos;s events and assigns each a factor, direction, magnitude and
          confidence. Each signal then moves its factor up or down from the previous day&apos;s value. Official company
          sources weigh more than general coverage, and a single day&apos;s move per factor is capped. On a day with no
          new signals, the factors hold.
        </p>
      </Block>

      <Block title="Freshness">
        <p>
          Older events count less. An event reported the day it happens counts in full; its weight then falls with age:{' '}
          {DECAY_ANCHORS.slice(1, -1).map(([days, m]) => `${pct(m)} at ${days} ${days === 1 ? 'day' : 'days'}`).join(', ')}.
          Structural and landmark events keep a minimum weight instead of fading out completely.
        </p>
      </Block>

      <Block title="Status bands">
        <ul className="list-disc space-y-1.5 pl-5">
          {bands.map(([min, status], i) => (
            <li key={status}>
              <strong>{min}–{i + 1 < bands.length ? bands[i + 1][0] - 1 : 100}</strong> — {status.replace('_', ' ')}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Limitations">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>ABRI reads news, not market data feeds. It reflects what is reported, when it is reported.</li>
          <li>Coverage is limited to a fixed list of technology and company sources; paywalled financial press is not included.</li>
          <li>Classification is done by AI models and can be wrong. The weights and starting values are editorial choices.</li>
          <li>The index began from an assumed starting level, so early readings say more about direction than absolute level.</li>
        </ul>
      </Block>

      <Block title="Disclaimer">
        <p>
          ABRI is an informational index. It is not financial, investment, or trading advice, and nothing here is a
          recommendation to buy or sell any asset.
        </p>
      </Block>
    </article>
  )
}
