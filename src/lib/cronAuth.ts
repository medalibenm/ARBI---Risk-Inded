// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Outside production the
// endpoints are open when no secret is configured, for local testing.
export function authorizeCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return process.env.NODE_ENV === 'production'
      ? Response.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
      : null
  }
  return request.headers.get('authorization') === `Bearer ${secret}`
    ? null
    : Response.json({ error: 'unauthorized' }, { status: 401 })
}
