// Runs once when the server starts. In development there is no scheduler, so
// kick off the daily update here if today's score is missing. Production is
// driven by Vercel Cron (vercel.json) and never takes this path.
export async function register() {
  if (process.env.NODE_ENV !== 'development' || process.env.NEXT_RUNTIME !== 'nodejs') return
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('[abri] OPENROUTER_API_KEY is not set; skipping the automatic daily update')
    return
  }

  const { runDailyUpdate } = await import('./lib/jobs/daily')
  // Not awaited: the site serves the last stored score while this runs.
  runDailyUpdate().then(
    (result) =>
      console.log(
        result.status === 'skipped'
          ? `[abri] daily update: ${result.date} already scored`
          : `[abri] daily update: ${result.date} scored ${result.score} from ${result.signals} signals — refresh to see it`
      ),
    (err) => console.error('[abri] daily update failed (previous score kept):', err.message)
  )
}
