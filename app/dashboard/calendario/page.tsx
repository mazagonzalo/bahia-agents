'use client'
import { useState, useEffect } from 'react'
import { PageHeader, Card, SectionTitle, T, EmptyState } from '../_components/ui'

type Kind = 'evento' | 'recordatorio' | 'contenido' | 'reporte'
type Item = { date: string; kind: Kind; title: string; detail?: string }
type Data = { items: Item[]; recurrentes: { title: string; detail: string }[]; from: string; days: number }

const KIND: Record<Kind, { label: string; color: string }> = {
  evento: { label: 'Evento', color: T.gold },
  recordatorio: { label: 'Recordatorio', color: T.teal },
  contenido: { label: 'Contenido', color: T.coral },
  reporte: { label: 'Reporte', color: T.sage },
}

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CalendarioPage() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    fetch('/api/agents/calendario').then(r => r.json()).then(setData).catch(() => setErr(true))
  }, [])

  // Agrupa por fecha, preservando el orden cronológico del endpoint.
  const byDate: { date: string; items: Item[] }[] = []
  for (const it of data?.items ?? []) {
    const last = byDate[byDate.length - 1]
    if (last && last.date === it.date) last.items.push(it)
    else byDate.push({ date: it.date, items: [it] })
  }

  return (
    <div>
      <PageHeader
        title="Calendario de publicación"
        blurb="Qué va a salir y cuándo — eventos del club, recordatorios automáticos, ciclo de carrusel promocional y reportes. Próximos 45 días."
      />

      {err ? (
        <EmptyState title="No se pudo cargar el calendario" sub="Intenta recargar." />
      ) : !data ? (
        <p style={{ color: T.muted, fontSize: 13 }}>Cargando…</p>
      ) : (
        <>
          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            {(Object.keys(KIND) as Kind[]).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: T.textSec }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: KIND[k].color }} />
                {KIND[k].label}
              </div>
            ))}
          </div>

          {data.recurrentes.length > 0 && (
            <Card style={{ marginBottom: 'var(--space-4)' }}>
              <SectionTitle>Recurrentes (sin fecha fija)</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'var(--space-2)' }}>
                {data.recurrentes.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{r.title}</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{r.detail}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {byDate.length === 0 ? (
            <EmptyState title="Nada programado" sub="No hay eventos ni salidas de contenido en los próximos 45 días." />
          ) : (
            <Card>
              {byDate.map(({ date, items }, gi) => (
                <div key={date} style={{ paddingTop: gi === 0 ? 0 : 'var(--space-4)', marginTop: gi === 0 ? 0 : 'var(--space-4)', borderTop: gi === 0 ? 'none' : `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, color: T.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>{fechaLarga(date)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: KIND[it.kind].color, marginTop: 5, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, color: T.text, fontWeight: 600, overflowWrap: 'anywhere' }}>{it.title}</div>
                          {it.detail && <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{it.detail}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
