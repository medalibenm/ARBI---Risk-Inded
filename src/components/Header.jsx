const NAV = [
  { label: 'INDEX', active: true },
  { label: 'NEWS', active: false },
  { label: 'ABOUT', active: false },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-20 bg-cream/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
        <span className="text-2xl font-extrabold tracking-tight text-ink">ABRI</span>
        <nav className="flex items-center gap-6 sm:gap-8">
          {NAV.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`pb-1 text-sm font-bold tracking-wide transition-colors ${
                item.active
                  ? 'border-b-2 border-primary text-primary'
                  : 'border-b-2 border-transparent text-ink hover:text-primary'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
