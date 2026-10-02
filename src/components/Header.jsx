'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'INDEX', href: '/' },
  { label: 'NEWS', href: '/news' },
  { label: 'ABOUT', href: '/methodology' },
]

export default function Header() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-foreground">ABRI</Link>
        <nav className="flex items-center gap-6 sm:gap-8">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`pb-1 text-sm font-bold tracking-wide transition-colors ${
                pathname === item.href
                  ? 'border-b-2 border-destructive text-destructive'
                  : 'border-b-2 border-transparent text-foreground hover:text-destructive'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
