const LINKS = ['INDEX', 'NEWS', 'PREDICT', 'METHODOLOGY', 'NEWSLETTER']

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.4-1.3 1.7-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4.1 4.1 0 0 1-1.9.1 4.1 4.1 0 0 0 3.8 2.9A8.3 8.3 0 0 1 2 18.4a11.6 11.6 0 0 0 6.3 1.9c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.5-1.3 2-2.2Z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M6.9 8.4H3.6V20H6.9V8.4ZM5.3 3.3a1.9 1.9 0 1 0 0 3.9 1.9 1.9 0 0 0 0-3.9ZM20.4 20h-3.3v-6.1c0-1.5 0-3.4-2-3.4s-2.4 1.6-2.4 3.3V20H9.4V8.4h3.2v1.6h.1c.4-.8 1.6-1.7 3.2-1.7 3.4 0 4.5 2.3 4.5 5.2V20Z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-divider">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:justify-between sm:px-8">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-extrabold tracking-tight text-ink">ABRI</span>
          <span className="text-xs font-semibold tracking-wide text-muted">AI BUBBLE RISK INDEX</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-5">
          {LINKS.map((link) => (
            <a key={link} href="#" className="text-xs font-bold tracking-wide text-ink hover:text-primary">
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-ink">
          <a href="#" aria-label="Twitter" className="hover:text-primary">
            <TwitterIcon />
          </a>
          <a href="#" aria-label="LinkedIn" className="hover:text-primary">
            <LinkedInIcon />
          </a>
          <a href="#" aria-label="Email" className="hover:text-primary">
            <MailIcon />
          </a>
        </div>
      </div>
    </footer>
  )
}
