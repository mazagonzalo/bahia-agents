'use client'
import { useState, type ReactNode } from 'react'
import { T } from './ui'

/**
 * Panel de disparo genérico para agentes POST-only (contenido, eventos):
 * un textarea → POST al endpoint → render del resultado.
 */
export function TriggerPanel({
  endpoint,
  label,
  placeholder,
  buildPayload,
  renderResult,
  cta = 'Generar',
}: {
  endpoint: string
  label: string
  placeholder: string
  buildPayload: (text: string) => Record<string, unknown>
  renderResult: (data: unknown) => ReactNode
  cta?: string
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    const t = text.trim()
    if (!t || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(t)),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(`Error ${res.status}: ${(data as { error?: string }).error ?? 'falló la generación'}`)
        setResult(null)
      } else {
        setResult(data)
      }
    } catch {
      setError('Error de red — intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <label style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>{label}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
          onBlur={(e) => { e.target.style.borderColor = T.border }}
          placeholder={placeholder}
          aria-label={label}
          rows={4}
          style={{
            width: '100%',
            marginTop: 10,
            resize: 'vertical',
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            color: T.text,
            padding: '12px 14px',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            transition: 'border-color var(--transition-fast)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={run} disabled={loading || !text.trim()}>
            {loading ? 'Procesando…' : cta}
          </button>
          {error && <span role="alert" style={{ color: T.danger, fontSize: 13 }}>{error}</span>}
        </div>
      </div>

      {result != null && <div>{renderResult(result)}</div>}
    </div>
  )
}
