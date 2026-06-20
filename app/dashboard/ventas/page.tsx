'use client'
import { PageHeader, Badge, Card, T } from '../_components/ui'
import { ChatPanel } from '../_components/ChatPanel'

// Pistas de arranque para guiar la simulación (no se envían solas; orientan al usuario).
const PROMPTS = [
  '¿Cuánto cuesta la membresía?',
  '¿Qué incluye el plan familiar?',
  'Quiero agendar una visita',
] as const

export default function VentasPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        title="Ventas"
        blurb="Asesor de membresías por WhatsApp. Responde dudas de instalaciones y planes, y empuja al prospecto a agendar una visita."
        actions={<Badge tone="success">● WhatsApp · Simulación</Badge>}
      />

      <Card style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Prueba con un mensaje como
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {PROMPTS.map((p) => (
            <span
              key={p}
              style={{
                background: T.surface2,
                color: T.textSec,
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                padding: '6px 13px',
                fontSize: 13,
                lineHeight: 1.3,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </Card>

      <ChatPanel
        endpoint="/api/agents/ventas"
        buildPayload={(text) => ({ leadId: 'test-panel', phone: '+5210000000000', text })}
        placeholder="Escribe como si fueras un prospecto…"
        intro="Simulación del bot de ventas. Escribe como un prospecto interesado en membresías y el agente responde igual que por WhatsApp. Las conversaciones de esta prueba se guardan bajo el lead «test-panel»."
      />
    </div>
  )
}
