'use client'

import { useState } from 'react'

function impactText(item) {
  if (!item.scored) return 'Scored at the next daily update'
  if (!item.hasSignal) return 'Reviewed: no impact on the index'
  if (item.contribution == null || Math.abs(item.contribution) < 0.05) return `${item.factorLabel}: no measurable move`
  const sign = item.contribution > 0 ? '+' : '−'
  return `${item.factorLabel} ${sign}${Math.abs(item.contribution).toFixed(1)}`
}

function NewsCard({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {item.source} · <time dateTime={item.publishedAt}>{item.publishedLabel}</time>
      </p>
      <h2 className="mt-2 text-sm font-extrabold leading-snug text-card-foreground sm:text-base">{item.title}</h2>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {(!item.scored || item.hasSignal) && <span
          className={`rounded-full px-2.5 py-1 font-extrabold uppercase tracking-wide ${
            item.heats ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-foreground'
          }`}
        >
          {item.heats ? '↑ Heats' : '↓ Cools'}
        </span>}
        <span className="font-bold text-card-foreground">{impactText(item)}</span>
      </p>

      {open && (
        <p className="mt-3 text-sm leading-relaxed text-card-foreground/80">
          {item.scored && !item.hasSignal
            ? 'The daily review found no meaningful effect on any ABRI factor.'
            : item.explanation ||
            `Classified as a ${item.factorLabel.toLowerCase()} signal. The written explanation is added at the next daily score update.`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-extrabold uppercase tracking-wide">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="text-card-foreground hover:text-destructive"
        >
          {open ? 'Hide explanation' : 'Show explanation'}
        </button>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-destructive hover:text-card-foreground">
          Read original →
        </a>
      </div>
    </li>
  )
}

export default function NewsList({ items }) {
  if (items.length === 0) {
    return <p className="mt-10 text-center text-sm text-muted-foreground">No relevant stories in the past 7 days.</p>
  }
  return (
    <ul className="mt-8 flex flex-col gap-4">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </ul>
  )
}
