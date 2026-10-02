import Link from 'next/link'
import SignalIcon from './SignalIcon'
import SectionHeading from './SectionHeading'

const FACTOR_UI = {
  funding: { icon: 'dollar', blurb: 'Capital flow and deal momentum.' },
  valuation: { icon: 'bars', blurb: 'Valuations, multiples and fundamentals.' },
  sentiment: { icon: 'chat', blurb: 'Investor mood and market hype.' },
  infrastructure: { icon: 'server', blurb: 'Chips, data centers and capex.' },
  correction: { icon: 'zigzag', blurb: 'Cooling signs that pull the index down.' },
}

function Impact({ impact }) {
  if (Math.abs(impact) < 0.05) return <span className="text-muted-foreground">no change today</span>
  return (
    <span className="font-bold text-card-foreground">
      {impact > 0 ? '↑' : '↓'} {Math.abs(impact).toFixed(1)} today
    </span>
  )
}

export default function SignalsSection({ index }) {
  if (!index) return null
  return (
    <section className="mx-auto max-w-6xl border-t border-border px-6 pb-14 pt-12 sm:px-8">
      <SectionHeading>WHY IS IT {index.score}?</SectionHeading>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
        Five factors, each scored 0–100 from the day&apos;s AI-market news. Four add heat; correction signals subtract it.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {index.factors.map((f) => (
          <Link
            key={f.key}
            href="/methodology"
            className="block rounded-lg border border-border bg-card p-6 transition-transform hover:-translate-y-0.5"
          >
            <SignalIcon icon={FACTOR_UI[f.key].icon} />
            <h3 className="mt-4 text-sm font-extrabold uppercase tracking-wide text-card-foreground">{f.name}</h3>
            <p className="mt-2 leading-none">
              <span className="text-2xl font-extrabold tracking-tighter text-card-foreground">{Math.round(f.score)}</span>
              <span className="ml-0.5 text-xs font-semibold text-muted-foreground">/100</span>
            </p>
            <p className="mt-1.5 text-xs"><Impact impact={f.impact} /></p>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.description || FACTOR_UI[f.key].blurb}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
