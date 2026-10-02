import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import '../index.css'

const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const DESCRIPTION =
  'ABRI is a daily 0–100 index measuring AI bubble risk from funding, valuations, sentiment, infrastructure spending, and market correction signals.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'ABRI — AI Bubble Risk Index', template: '%s — ABRI' },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'ABRI', title: 'ABRI — AI Bubble Risk Index', description: DESCRIPTION, url: '/' },
  twitter: { card: 'summary', title: 'ABRI — AI Bubble Risk Index', description: DESCRIPTION },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
