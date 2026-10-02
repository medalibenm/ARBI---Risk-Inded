export default function SectionHeading({ children, className = '', as: Tag = 'h2' }) {
  return (
    <Tag className={`flex items-center justify-center gap-2 text-xs font-bold tracking-[0.3em] text-foreground ${className}`}>
      <span aria-hidden className="text-[0.6rem] text-destructive">✦</span>
      {children}
      <span aria-hidden className="text-[0.6rem] text-destructive">✦</span>
    </Tag>
  )
}
