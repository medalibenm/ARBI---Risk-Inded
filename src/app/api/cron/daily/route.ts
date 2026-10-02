import { authorizeCron } from '../../../../lib/cronAuth'
import { runDailyUpdate } from '../../../../lib/jobs/daily'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const denied = authorizeCron(request)
  if (denied) return denied
  try {
    return Response.json(await runDailyUpdate())
  } catch (err) {
    // No score was stored; the previous public score stays up. Re-invoke to retry.
    console.error('daily update failed:', err)
    return Response.json({ error: String((err as Error).message) }, { status: 500 })
  }
}
