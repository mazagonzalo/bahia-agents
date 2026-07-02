'use client'
import { useState, useEffect } from 'react'
import { PageHeader, Badge, Card, T } from '../_components/ui'
import { ChatPanel } from '../_components/ChatPanel'

const INTRO = `Soy la secretaria del sistema. Pregúntame por el estado de los agentes, los leads de la semana (puedes preguntar por un lead por su nombre), las tendencias o los creativos pendientes.

Para aprobar creativos escribe «aprueba» — te listo los borradores y apruebas el que quieras ("aprueba el 2"). Los carruseles entran al ciclo de rotación.`

type Resumen = {
  fecha: string
  leads: { nuevos24h: number; nuevos7d: number; calificados: number; citados: number; cerrados7d: number }
  creativos: { borradores: number }
  atencion: string[]
  ultimaTendencia: string | null
  gastoMesUsd: number
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: 'var(--font-headline)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function ResumenHoy() {
  const [r, setR] = useState<Resumen | null>(null)
  useEffect(() => {
    fetch('/api/agents/secretaria/resumen').then((x) => x.json()).then(setR).catch(() => {})
  }, [])
  if (!r) return null

  return (
    <Card style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600, marginBottom: 12 }}>
        Resumen de hoy · {r.fecha}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', marginBottom: r.atencion.length ? 16 : 0 }}>
        <Stat label="Leads 24h" value={r.leads.nuevos24h} />
        <Stat label="Leads 7d" value={r.leads.nuevos7d} />
        <Stat label="Calificados" value={r.leads.calificados} />
        <Stat label="Citados" value={r.leads.citados} />
        <Stat label="Cerrados 7d" value={r.leads.cerrados7d} />
        <Stat label="Borradores" value={r.creativos.borradores} />
      </div>
      {r.atencion.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: T.warning, fontWeight: 700, marginBottom: 6 }}>⚠️ Necesita tu atención</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {r.atencion.map((a, i) => (
              <li key={i} style={{ fontSize: 13, color: T.textSec, marginBottom: 3 }}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {r.ultimaTendencia && (
        <div style={{ marginTop: r.atencion.length ? 12 : 12, fontSize: 12, color: T.muted }}>
          Última tendencia detectada: <span style={{ color: T.gold }}>{r.ultimaTendencia}</span>
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 12, color: T.muted }}>
        Gasto de IA este mes: <span style={{ color: T.text }}>${r.gastoMesUsd.toFixed(2)} USD</span>
      </div>
    </Card>
  )
}

export default function SecretariaPage() {
  return (
    <>
      <PageHeader
        title="Secretaria"
        blurb="Tu asistente del sistema: lee el estado de todos los agentes, busca leads por nombre y aprueba creativos de forma segura."
        actions={<Badge tone="gold">Aprueba con «aprueba el N»</Badge>}
      />
      <ResumenHoy />
      <ChatPanel
        endpoint="/api/agents/secretaria"
        placeholder="Pregunta por el estado, por un lead por su nombre, o escribe «aprueba»…"
        intro={INTRO}
      />
    </>
  )
}
