'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Trend = { topic: string; score: number; angle: string; evidence: string }
type GTrend = { keyword: string; avgScore: number; trend: string; insight: string }
type ContentIdea = {
  title: string; format: string
  hook: { text: string; pattern: string; triggerWords: string[] }
  copyStructure: { framework: string; step1: string; step2: string; step3: string; cta: string }
  platforms: { reel: string; tiktok: string; stories: string; carrusel: string }
  instalacion: string; targetSegment: string; hashtags: string[]
  trendConnection: string; urgency: number
}
type Report = {
  generatedAt: string; period: string
  trends: Trend[]; googleTrends: GTrend[]
  seasonality: { touristFlow: string; dominantProfile: string; peakWindow: string; localMarket: string; insight: string }
  strategy: { primarySegment: string; secondarySegment: string; message: string; avoid: string }
  competitive: { topCompetitors: string[]; theirAngle: string; gap: string; counterPositioning: string }
  audienceWhere: { accounts: string[]; contentTypes: string[]; ownHashtags: string[]; insight: string }
  hashtags: { masivos: string[]; nicho: string[]; locales: string[]; mixRecomendado: string }
  contentOpportunities: { instalacion: string; oportunidad: string; momento: string; formatoIdeal: string; urgencia: number }[]
  viralPatterns: { pattern: string; description: string; whyItWorks: string; adaptForBahia: string; differentiator: string }[]
  contentIdeas: ContentIdea[]
}

// ─── Primitivos de UI ─────────────────────────────────────────────────────────

const C = {
  bg: '#0a0a0f',
  surface: '#12121a',
  card: '#1a1a26',
  border: '#2a2a3d',
  accent: '#7c6dff',
  accentSoft: '#7c6dff22',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  text: '#e8e8f0',
  muted: '#7070a0',
  tag: '#1e1e30',
}

function Tag({ children, color = C.accentSoft }: { children: string; color?: string }) {
  return (
    <span style={{ background: color, color: C.accent, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-block', margin: '2px 3px' }}>
      {children}
    </span>
  )
}

function Badge({ n, max = 10 }: { n: number; max?: number }) {
  const pct = n / max
  const color = pct > 0.7 ? C.green : pct > 0.4 ? C.amber : C.red
  return (
    <span style={{ background: color + '22', color, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
      {n}/{max}
    </span>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
        {icon} &nbsp;{title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 14 }}>
      <span style={{ color: C.muted, minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ color: C.text }}>{value}</span>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? C.green : score >= 65 ? C.amber : C.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 32 }}>{score}</span>
    </div>
  )
}

// ─── Secciones del reporte ────────────────────────────────────────────────────

function TrendsSection({ trends, googleTrends }: { trends: Trend[]; googleTrends: GTrend[] }) {
  return (
    <Card title="Tendencias de la semana" icon="📡">
      <div style={{ display: 'grid', gap: 14 }}>
        {trends.map((t, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>#{i + 1}</span>
              <span style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>{t.topic}</span>
              <div style={{ marginLeft: 'auto', minWidth: 140 }}><ScoreBar score={t.score} /></div>
            </div>
            <p style={{ color: C.accent, fontSize: 13, margin: '0 0 6px 0' }}>→ {t.angle}</p>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, fontStyle: 'italic' }}>{t.evidence}</p>
          </div>
        ))}
      </div>
      {googleTrends?.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {googleTrends.map((g, i) => {
            const arrow = g.trend === 'subiendo' ? '↑' : g.trend === 'bajando' ? '↓' : '→'
            const col = g.trend === 'subiendo' ? C.green : g.trend === 'bajando' ? C.red : C.amber
            return (
              <div key={i} style={{ background: C.surface, borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ color: C.muted }}>{g.keyword}</span>
                <span style={{ color: C.text, fontWeight: 700, margin: '0 6px' }}>{g.avgScore}</span>
                <span style={{ color: col, fontWeight: 700 }}>{arrow} {g.trend}</span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function StrategySection({ seasonality: s, strategy: st }: { seasonality: Report['seasonality']; strategy: Report['strategy'] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Estacionalidad" icon="🌊">
        <Row label="Flujo turístico" value={s.touristFlow} />
        <Row label="Perfil dominante" value={s.dominantProfile} />
        <Row label="Ventana" value={s.peakWindow} />
        <Row label="Mercado local" value={s.localMarket} />
        <div style={{ background: C.accentSoft, borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 13, color: C.accent }}>
          💡 {s.insight}
        </div>
      </Card>
      <Card title="Estrategia esta semana" icon="🎯">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Atacar primero</div>
          <div style={{ color: C.green, fontWeight: 700, fontSize: 15 }}>{st.primarySegment}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Secundario</div>
          <div style={{ color: C.text, fontSize: 14 }}>{st.secondarySegment}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Mensaje clave</div>
          <div style={{ color: C.accent, fontStyle: 'italic', fontSize: 14 }}>"{st.message}"</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Evitar</div>
          <div style={{ color: C.red, fontSize: 13 }}>{st.avoid}</div>
        </div>
      </Card>
    </div>
  )
}

function ContentIdeasSection({ ideas }: { ideas: ContentIdea[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const sorted = [...ideas].sort((a, b) => b.urgency - a.urgency)

  return (
    <Card title="Ideas de contenido" icon="💡">
      <div style={{ display: 'grid', gap: 12 }}>
        {sorted.map((idea, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${open === i ? C.accent : C.border}` }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '14px 18px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <Badge n={idea.urgency} />
              <span style={{ color: C.text, fontWeight: 600, fontSize: 14, flex: 1 }}>{idea.title}</span>
              <span style={{ color: C.muted, fontSize: 12, marginRight: 8 }}>{idea.format}</span>
              <span style={{ color: C.muted, fontSize: 16 }}>{open === i ? '▲' : '▼'}</span>
            </button>

            {open === i && (
              <div style={{ padding: '0 18px 18px', display: 'grid', gap: 14 }}>
                <div style={{ background: C.bg, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Hook · {idea.hook.pattern}
                  </div>
                  <div style={{ color: C.accent, fontWeight: 600, fontSize: 14 }}>"{idea.hook.text}"</div>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {idea.hook.triggerWords?.map(w => <Tag key={w}>{w}</Tag>)}
                  </div>
                </div>

                <div style={{ background: C.bg, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Copy · {idea.copyStructure.framework}
                  </div>
                  {[idea.copyStructure.step1, idea.copyStructure.step2, idea.copyStructure.step3].filter(Boolean).map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 6, paddingLeft: 12, borderLeft: `2px solid ${C.accent}` }}>{s}</div>
                  ))}
                  <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginTop: 8 }}>CTA: {idea.copyStructure.cta}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(idea.platforms ?? {}).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ background: C.bg, borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{k}</div>
                      <div style={{ fontSize: 12, color: C.text }}>{v as string}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.muted, marginRight: 4 }}>→ {idea.instalacion} · {idea.targetSegment}</span>
                  {idea.hashtags?.slice(0, 6).map(h => <Tag key={h}>{h}</Tag>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function CompetitiveSection({ competitive: c, audienceWhere: a }: { competitive: Report['competitive']; audienceWhere: Report['audienceWhere'] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Inteligencia competitiva" icon="🔍">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Competidores detectados</div>
          {c?.topCompetitors?.map((comp, i) => (
            <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 4, paddingLeft: 10, borderLeft: `2px solid ${C.border}` }}>{comp}</div>
          ))}
        </div>
        <Row label="Su ángulo" value={c?.theirAngle ?? ''} />
        <Row label="El gap" value={c?.gap ?? ''} />
        <div style={{ background: '#22c55e15', borderRadius: 10, padding: '10px 14px', marginTop: 8, fontSize: 13, color: C.green }}>
          🏆 {c?.counterPositioning}
        </div>
      </Card>
      <Card title="Dónde vive la audiencia" icon="👥">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Cuentas que siguen</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {a?.accounts?.map(acc => <Tag key={acc}>{acc}</Tag>)}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Tipo de contenido</div>
          {a?.contentTypes?.map((t, i) => <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 3 }}>· {t}</div>)}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Sus hashtags</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {a?.ownHashtags?.map(h => <Tag key={h}>{h}</Tag>)}
        </div>
      </Card>
    </div>
  )
}

function HashtagsSection({ hashtags: h }: { hashtags: Report['hashtags'] }) {
  return (
    <Card title="Hashtags recomendados" icon="#️⃣">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Masivos</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{h?.masivos?.map(t => <Tag key={t}>{t}</Tag>)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Nicho</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{h?.nicho?.map(t => <Tag key={t}>{t}</Tag>)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Locales</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{h?.locales?.map(t => <Tag key={t}>{t}</Tag>)}</div>
        </div>
      </div>
      <div style={{ background: C.accentSoft, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.accent }}>
        📐 {h?.mixRecomendado}
      </div>
    </Card>
  )
}

function ViralSection({ patterns, opportunities }: { patterns: Report['viralPatterns']; opportunities: Report['contentOpportunities'] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Patrones virales" icon="🔥">
        {patterns?.map((p, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 6 }}>{p.pattern}</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{p.description}</div>
            <div style={{ fontSize: 13, color: C.accent, marginBottom: 6 }}>Para Bahía: {p.adaptForBahia}</div>
            {p.differentiator && <div style={{ fontSize: 12, color: C.green }}>⭐ {p.differentiator}</div>}
          </div>
        ))}
      </Card>
      <Card title="Oportunidades de contenido" icon="📸">
        {[...(opportunities ?? [])].sort((a, b) => b.urgencia - a.urgencia).map((o, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{o.instalacion}</span>
              <Badge n={o.urgencia} />
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>{o.oportunidad}</div>
            <div style={{ fontSize: 12, color: C.accent }}>Cuándo: {o.momento}</div>
            <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>Formato: {o.formatoIdeal}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const [report, setReport] = useState<Report | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/tendencias/report')
      if (res.ok) {
        const data = await res.json()
        setReport(data.report)
        setGeneratedAt(data.generatedAt)
        setError(null)
      } else {
        setError('No hay reporte generado aún')
      }
    } catch {
      setError('Error al cargar el reporte')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReport() }, [fetchReport])

  async function generate() {
    setGenerating(true)
    const startedAt = new Date().toISOString()

    // Dispara el agente sin esperar — tarda ~75s, no bloqueamos el UI
    fetch('/api/agents/tendencias').catch(() => {})

    // Polling cada 10s hasta encontrar un reporte más nuevo que startedAt
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      try {
        const r = await fetch('/api/agents/tendencias/report')
        if (r.ok) {
          const d = await r.json()
          if (d.generatedAt > startedAt) {
            setReport(d.report)
            setGeneratedAt(d.generatedAt)
            setGenerating(false)
            clearInterval(poll)
            return
          }
        }
      } catch { /* sigue intentando */ }
      if (attempts >= 42) { // 42 × 10s = 7 min máximo
        setGenerating(false)
        clearInterval(poll)
      }
    }, 10000)
  }

  const timeAgo = generatedAt
    ? (() => {
        const mins = Math.floor((Date.now() - new Date(generatedAt).getTime()) / 60000)
        return mins < 1 ? 'hace menos de 1 min' : mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins / 60)}h`
      })()
    : null

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.text }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 20, position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>Bahía — Briefing de Marketing</div>
          {report?.period && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{report.period}</div>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {timeAgo && <span style={{ fontSize: 13, color: C.muted }}>Actualizado {timeAgo}</span>}
          <button
            onClick={fetchReport}
            style={{ background: C.tag, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
          >
            Actualizar
          </button>
          <button
            onClick={generate}
            disabled={generating}
            style={{ background: generating ? C.border : C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: generating ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: generating ? 0.7 : 1 }}
          >
            {generating ? 'Generando...' : 'Nuevo reporte'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: C.muted }}>Cargando reporte...</div>
        )}

        {!loading && generating && !report && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>Generando reporte</div>
            <div style={{ color: C.muted, marginTop: 8 }}>Esto toma ~90 segundos. La página se actualizará sola.</div>
          </div>
        )}

        {!loading && error && !report && !generating && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>No hay reporte todavía</div>
            <div style={{ color: C.muted, marginTop: 8, marginBottom: 24 }}>Genera el primero con el botón de arriba</div>
          </div>
        )}

        {generating && (
          <div style={{ background: C.accentSoft, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, fontSize: 14, color: C.accent }}>
            ⚙️ Generando reporte — verifica cada 10 segundos, listo en ~90s.
          </div>
        )}

        {report && (
          <>
            <TrendsSection trends={report.trends} googleTrends={report.googleTrends} />
            <StrategySection seasonality={report.seasonality} strategy={report.strategy} />
            <ContentIdeasSection ideas={report.contentIdeas} />
            <ViralSection patterns={report.viralPatterns} opportunities={report.contentOpportunities} />
            <CompetitiveSection competitive={report.competitive} audienceWhere={report.audienceWhere} />
            <HashtagsSection hashtags={report.hashtags} />
          </>
        )}
      </div>
    </div>
  )
}
