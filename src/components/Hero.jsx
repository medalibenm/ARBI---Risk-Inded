import { MascotHandsPeek } from './PixelMascot'
import PredictionCard from './PredictionCard'
import SectionHeading from './SectionHeading'

export default function Hero() {
  return (
    <section className="relative w-full pb-10 pt-20 sm:pt-2">
      <div className="mx-auto max-w-sm px-6 text-center sm:px-8">
        <SectionHeading className="!text-sm sm:!text-base">AI BUBBLE RISK</SectionHeading>

        <div className="relative mt-20 sm:mt-24">
          {/* mascot peeking over the top edge of the card */}
          <div className="absolute bottom-full left-1/2 z-10 w-24 -translate-x-1/2 translate-y-[8%] sm:w-28">
            <MascotHandsPeek />
          </div>

          <div className="relative rounded-lg border border-border bg-card px-5 pb-5 pt-7 sm:px-7">
            <div className="flex items-end justify-center leading-none">
              <span className="text-5xl font-extrabold tracking-tighter text-card-foreground sm:text-6xl">78</span>
              <span className="mb-1.5 ml-1 text-lg font-semibold text-muted-foreground sm:text-xl">/100</span>
            </div>
            <p className="mt-2.5 flex items-center justify-center gap-2">
              <span className="rounded-full bg-destructive px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-destructive-foreground sm:text-sm">
                Very Hot
              </span>
              <span className="text-lg sm:text-xl" aria-hidden>🔥</span>
            </p>
            <p className="mt-2 text-xs text-card-foreground sm:text-sm">
              <span className="font-bold text-destructive">↑</span> <span className="font-bold">6 points</span>{' '}
              <span className="text-muted-foreground">since yesterday</span>
            </p>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-xs text-xs leading-relaxed text-foreground/80 sm:text-sm">
          The AI market is showing increasing signs of speculative overheating.
        </p>

        <div className="mx-auto mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button className="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-[0.7rem] font-bold uppercase tracking-wide text-destructive-foreground transition-transform hover:-translate-y-0.5 sm:text-xs">
            See what moved it →
          </button>
          <button className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-[0.7rem] font-bold uppercase tracking-wide text-card-foreground transition-transform hover:-translate-y-0.5 sm:text-xs">
            Make your prediction →
          </button>
        </div>
      </div>

      {/* prediction notification, sits near the top and scrolls away with the page */}
      <div className="absolute right-0 top-0 z-10 w-[calc(100vw-1.5rem)] max-w-xs">
        <PredictionCard />
      </div>
    </section>
  )
}
