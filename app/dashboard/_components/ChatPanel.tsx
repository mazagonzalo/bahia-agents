'use client'
import { useState, useRef, useEffect } from 'react'
import { T } from './ui'

type Msg = { role: 'user' | 'assistant'; content: string }

/**
 * Panel de conversación genérico para agentes que responden un `reply` string
 * (ventas, secretaria). POST al endpoint con el payload construido por buildPayload.
 */
export function ChatPanel({
  endpoint,
  buildPayload,
  placeholder = 'Escribe un mensaje…',
  intro,
}: {
  endpoint: string
  buildPayload?: (text: string) => Record<string, unknown>
  placeholder?: string
  intro?: string
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setLoading(true)
    try {
      const payload = buildPayload ? buildPayload(text) : { text }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      const reply = res.ok
        ? (data.reply ?? data.message ?? JSON.stringify(data))
        : `Error ${res.status}: ${data.error ?? 'no se pudo responder'}`
      setMessages((m) => [...m, { role: 'assistant', content: String(reply) }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Error de red — intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - 160px)', minHeight: 360, padding: 0, overflow: 'hidden' }}>
      <div role="log" aria-live="polite" aria-label="Conversación" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', margin: 'auto', maxWidth: 420, lineHeight: 1.6 }}>
            {intro ?? 'Inicia la conversación para probar al agente.'}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
            <div
              style={{
                background: m.role === 'user' ? 'var(--color-primary)' : T.surface2,
                color: m.role === 'user' ? T.bg : T.text,
                padding: '10px 14px',
                borderRadius: 14,
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                border: m.role === 'user' ? 'none' : `1px solid ${T.border}`,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div role="status" aria-label="El agente está escribiendo" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '10px 14px' }}>
            <style>{`@keyframes bahia-typing{0%,60%,100%{opacity:.3}30%{opacity:1}}`}</style>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: T.muted, animation: `bahia-typing 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, padding: 'var(--space-3)', display: 'flex', gap: 10 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
          onBlur={(e) => { e.target.style.borderColor = T.border }}
          placeholder={placeholder}
          aria-label="Mensaje"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            color: T.text,
            padding: '10px 14px',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            transition: 'border-color var(--transition-fast)',
          }}
        />
        <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  )
}
