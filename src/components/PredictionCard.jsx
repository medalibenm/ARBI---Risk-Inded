export default function PredictionCard() {
  return (
    <div className="animate-nudge-x flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card">
      <p className="text-xs font-bold uppercase leading-snug text-ink">
        Can you predict when the AI bubble will pop?
      </p>
      <button className="shrink-0 rounded-xl bg-risk px-3 py-1.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5">
        Predict →
      </button>
    </div>
  )
}
