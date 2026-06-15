'use client'
import { useState, useRef, useEffect } from 'react'

const LEAD_ID = '00000000-0000-0000-0000-000000000099'
const PHONE   = '520000000000'

type Message = { role: 'user' | 'assistant'; text: string }

export default function TestChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    const res  = await fetch('/api/agents/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: LEAD_ID, phone: PHONE, text }),
    })
    const data = await res.json()
    setMessages(prev => [...prev, { role: 'assistant', text: data.reply ?? data.error ?? 'Sin respuesta' }])
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ background: '#075e54', color: '#fff', padding: '16px 20px', borderRadius: '12px 12px 0 0' }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Agente de Ventas — Bahía Club</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Prueba de conversación</div>
      </div>

      <div style={{
        background: '#ece5dd',
        minHeight: 400,
        maxHeight: 500,
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: 13, marginTop: 40 }}>
            Escribe un mensaje para comenzar...
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: m.role === 'user' ? '#dcf8c6' : '#fff',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              maxWidth: '80%',
              fontSize: 14,
              lineHeight: 1.5,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', fontSize: 14, color: '#999' }}>
              Escribiendo...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', borderRadius: '0 0 12px 12px', overflow: 'hidden', border: '1px solid #ddd', borderTop: 'none' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, padding: '14px 16px', border: 'none', outline: 'none', fontSize: 14 }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ background: '#075e54', color: '#fff', border: 'none', padding: '0 20px', cursor: 'pointer', fontSize: 14 }}
        >
          Enviar
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#999', textAlign: 'center' }}>
        Simulando prospecto · Lead ID de prueba
      </div>
    </div>
  )
}
