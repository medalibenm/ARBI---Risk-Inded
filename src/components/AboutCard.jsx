function BookIcon() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M12 6.5C10.5 5.3 8 4.7 5.5 4.8c-.6 0-1 .5-1 1.1v11.6c0 .6.5 1.1 1.1 1 2.3-.2 4.7.4 6 1.5V6.5Z" />
        <path d="M12 6.5c1.5-1.2 4-1.8 6.5-1.7.6 0 1 .5 1 1.1v11.6c0 .6-.5 1.1-1.1 1-2.3-.2-4.7.4-6 1.5V6.5Z" />
      </svg>
    </span>
  )
}

export default function AboutCard() {
  return (
    <div className="h-full rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <BookIcon />
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-card-foreground">About ABRI</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-card-foreground/80">
        ABRI is a daily index that measures the risk of an AI bubble based on funding, valuations,
        sentiment, infrastructure, and market signals.
      </p>
      <a href="#" className="mt-4 inline-block text-sm font-extrabold uppercase tracking-wide text-destructive hover:text-card-foreground">
        Learn our methodology →
      </a>
    </div>
  )
}
