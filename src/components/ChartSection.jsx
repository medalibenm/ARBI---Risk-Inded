import AbriChart from './AbriChart'
import AboutCard from './AboutCard'
import SectionHeading from './SectionHeading'

export default function ChartSection({ history }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 sm:px-8">
      <div className="grid grid-cols-1 gap-10 border-t border-border pt-10 lg:grid-cols-[1fr_320px]">
        <div>
          <SectionHeading>ABRI OVER THE PAST 30 DAYS</SectionHeading>
          <div className="mt-6">
            {history.length > 0 ? (
              <AbriChart data={history} />
            ) : (
              <p className="text-center text-sm text-muted-foreground">History appears here after the first daily score.</p>
            )}
          </div>
        </div>
        <div className="lg:pt-9">
          <AboutCard />
        </div>
      </div>
    </section>
  )
}
