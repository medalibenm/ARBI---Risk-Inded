import { signals } from '../data/signals'
import SignalIcon from './SignalIcon'
import SectionHeading from './SectionHeading'

export default function SignalsSection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-border px-6 pb-14 pt-12 sm:px-8">
      <SectionHeading>WHY IS IT 78?</SectionHeading>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
        We analyze 20+ signals across valuations, sentiment, funding, momentum, and market behavior.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {signals.map((s) => (
          <div key={s.title} className="rounded-lg border border-border bg-card p-6">
            <SignalIcon icon={s.icon} />
            <h3 className="mt-4 text-sm font-extrabold uppercase tracking-wide text-card-foreground">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
