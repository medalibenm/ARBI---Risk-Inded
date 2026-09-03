const TONE_CLASSES = {
  pink: { bg: 'bg-signal-pink', fg: 'text-signal-pinkIcon' },
  peach: { bg: 'bg-signal-peach', fg: 'text-signal-peachIcon' },
  blue: { bg: 'bg-signal-blue', fg: 'text-signal-blueIcon' },
  green: { bg: 'bg-signal-green', fg: 'text-signal-greenIcon' },
  purple: { bg: 'bg-signal-purple', fg: 'text-signal-purpleIcon' },
}

function Glyph({ icon }) {
  switch (icon) {
    case 'bars':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <rect x="4" y="13" width="3.5" height="7" rx="0.5" />
          <rect x="10.25" y="9" width="3.5" height="11" rx="0.5" />
          <rect x="16.5" y="4" width="3.5" height="16" rx="0.5" />
        </svg>
      )
    case 'dollar':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3c0 4 8 2 8 6.5 0 1.7-1.8 3-4 3s-4-1.3-4-3" strokeLinecap="round" />
        </svg>
      )
    case 'server':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <rect x="4" y="5" width="16" height="5" rx="1" />
          <rect x="4" y="14" width="16" height="5" rx="1" />
          <circle cx="8" cy="7.5" r="0.9" fill="white" />
          <circle cx="8" cy="16.5" r="0.9" fill="white" />
        </svg>
      )
    case 'zigzag':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 16l4-8 4 6 4-9 4 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H10l-4.5 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
        </svg>
      )
    case 'face':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <path d="M8.5 15c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

export default function SignalIcon({ tone, icon }) {
  const classes = TONE_CLASSES[tone]
  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${classes.bg} ${classes.fg}`}>
      <Glyph icon={icon} />
    </div>
  )
}
