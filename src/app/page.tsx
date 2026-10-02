import Hero from '../components/Hero'
import SignalsSection from '../components/SignalsSection'
import ChartSection from '../components/ChartSection'
import { getIndexData } from '../lib/queries'

// Rendered per request so the page always shows the latest stored score.
export const dynamic = 'force-dynamic'

export default async function IndexPage() {
  const index = await getIndexData()
  return (
    <>
      <Hero index={index} />
      <SignalsSection index={index} />
      <ChartSection history={index?.history ?? []} />
    </>
  )
}
