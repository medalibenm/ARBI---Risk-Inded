import { authorizeCron } from '../../../../lib/cronAuth'
import { pollFeeds } from '../../../../lib/news/poll'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const denied = authorizeCron(request)
  if (denied) return denied
  try {
    return Response.json(await pollFeeds())
  } catch (err) {
    console.error('poll failed:', err)
    return Response.json({ error: String((err as Error).message) }, { status: 500 })
  }
}
