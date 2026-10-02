import { MODELS } from '../config'

export type JsonCall = {
  model: string
  system: string
  user: string
  schemaName: string
  schema: Record<string, unknown>
  maxTokens?: number
}

export type JsonResult<T> = { data: T; model: string; cost: number }

async function callOnce<T>(call: JsonCall): Promise<JsonResult<T>> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY is not set')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'x-title': 'ABRI',
    },
    body: JSON.stringify({
      model: call.model,
      messages: [
        { role: 'system', content: call.system },
        { role: 'user', content: call.user },
      ],
      response_format: { type: 'json_schema', json_schema: { name: call.schemaName, strict: true, schema: call.schema } },
      max_tokens: call.maxTokens,
      usage: { include: true },
    }),
    signal: AbortSignal.timeout(120_000),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok || body?.error) {
    throw new Error(`${call.model}: ${body?.error?.message ?? `HTTP ${res.status}`}`)
  }
  const content: string = body?.choices?.[0]?.message?.content ?? ''
  // Some providers wrap JSON in a code fence despite response_format.
  const json = content.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
  let data: T
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error(`${call.model}: response was not valid JSON`)
  }
  return { data, model: body.model ?? call.model, cost: Number(body?.usage?.cost ?? 0) }
}

export type DecisionQuestion =
  | { type: 'noul'; instructions: string; criteria: { true: string; false: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] }

export type DecisionAnswer = {
  type: string
  noul?: number
  choice?: string
  score?: number
  confidence?: number
  probabilities?: Record<string, number>
}

// Decision models (TypeSafe Jev) are not chat models: they take a state plus
// typed questions and return probabilities, via OpenRouter's Decisions endpoint.
export async function callDecisions(
  model: string,
  state: Record<string, unknown>,
  questions: Record<string, DecisionQuestion>
): Promise<JsonResult<Record<string, DecisionAnswer>>> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY is not set')
  const res = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-title': 'ABRI' },
    body: JSON.stringify({ model, state, questions }),
    signal: AbortSignal.timeout(60_000),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.error || !body?.answers) {
    throw new Error(`${model}: ${body?.error?.message ?? `HTTP ${res.status}`}`)
  }
  return { data: body.answers, model: body.model ?? model, cost: Number(body?.usage?.cost ?? 0) }
}

// Tries the given model, then the configured fallback. `validate` throws on a
// structurally unusable answer, which also triggers the fallback.
export async function callJson<T>(call: JsonCall, validate: (raw: any) => T): Promise<JsonResult<T>> {
  try {
    const r = await callOnce<any>(call)
    return { ...r, data: validate(r.data) }
  } catch (primaryError) {
    if (call.model === MODELS.fallback) throw primaryError
    try {
      const r = await callOnce<any>({ ...call, model: MODELS.fallback })
      return { ...r, data: validate(r.data) }
    } catch (fallbackError) {
      throw new Error(`${(primaryError as Error).message}; fallback failed: ${(fallbackError as Error).message}`)
    }
  }
}
