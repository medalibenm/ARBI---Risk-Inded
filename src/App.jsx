import Header from './components/Header'
import Hero from './components/Hero'
import SignalsSection from './components/SignalsSection'
import ChartSection from './components/ChartSection'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
      <Header />
      <Hero />
      <SignalsSection />
      <ChartSection />
      <Footer />
    </div>
  )
}
