export default function SectionHeading({ children, className = '' }) {
  return (
    <p className={`flex items-center justify-center gap-2 text-xs font-bold tracking-[0.3em] text-ink ${className}`}>
      <span aria-hidden className="text-[0.6rem] text-primary">✦</span>
      {children}
      <span aria-hidden className="text-[0.6rem] text-primary">✦</span>
    </p>
  )
}
