import { OptimizeRequest, OptimizeResult, EtfPoint } from './types'

const API_BASE = '/api'

export async function optimizePortfolio(req: OptimizeRequest): Promise<OptimizeResult> {
  const res = await fetch(`${API_BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    // FastAPI validation errors return detail as an array of {msg, loc} objects
    const detail = Array.isArray(err.detail)
      ? err.detail.map((e: { msg: string; loc?: string[] }) => e.msg).join('; ')
      : err.detail || `Error ${res.status}`
    throw new Error(detail)
  }
  return res.json()
}

export async function fetchEtfScatter(): Promise<EtfPoint[]> {
  const res = await fetch(`${API_BASE}/etf-scatter`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ETF scatter data: ${res.status}`)
  }
  const data = await res.json()
  return data.etfs
}
