'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  T, Card, StatCard, SectionTitle, Ring, ScoreBar, FormatBadge, HashTag, TrendArrow,
  EmptyState, PageHeader, Skeleton, SkeletonText,
} from '../_components/ui'

// Separador de miles es-MX para todos los números mostrados.
const nf = (n: number) => n.toLocaleString('es-MX')

// ─── Types (portados del monolito) ────────────────────────────────────────────

type Trend = { topic: string; score: number; angle: string; evidence: string }
type GTrend = { keyword: string; avgScore: number; trend: string; insight: string }
type MusicOption = { title: string; artist: string; bpm: number; mood: string; why: string }
type ContentIdea = {
  title: string; format: string
  hook: { text: string; pattern: string; triggerWords: string[] }
  copyStructure: { framework: string; step1: string; step2: string; step3: string; cta: string }
  platforms: { reel: string; tiktok: string; stories: string; carrusel: string }
  music?: MusicOption[]
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

// ─── Secciones (re-tematizadas a oscuro con T.* y tokens) ──────────────────────

function HeroStats({ report }: { report: Report }) {
  const topScore = Math.max(...(report.trends?.map(t => t.score) ?? [0]))
  const ideas = report.contentIdeas?.length ?? 0
  const topUrgency = Math.max(...(report.contentIdeas?.map(i => i.urgency) ?? [0]))
  return (
    <div className="grid-kpis" style={{ marginBottom: 'var(--space-6)' }}>
      <StatCard label="Tendencia top" value={nf(topScore)} sub={report.trends?.[0]?.topic} color={T.gold} />
      <StatCard label="Ideas listas" value={nf(ideas)} sub={`${nf(report.contentIdeas?.filter(i => i.urgency >= 8).length ?? 0)} urgentes`} color={T.teal} />
      <StatCard label="Urgencia máx" value={`${nf(topUrgency)}/10`} sub={report.contentIdeas?.find(i => i.urgency === topUrgency)?.format} color={T.coral} />
      <StatCard label="Período" value={report.period?.split(' ')[0]} sub={report.period?.split(' ').slice(1).join(' ')} color={T.textSec} />
    </div>
  )
}

function TrendsSection({ trends, googleTrends }: { trends: Trend[]; googleTrends: GTrend[] }) {
  return (
    <div className="trends-split" style={{ marginBottom: 'var(--space-4)' }}>
      <Card>
        <SectionTitle>Tendencias · Perplexity</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {trends?.map((t, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: T.muted, fontWeight: 700, minWidth: 16 }}>#{nf(i + 1)}</span>
                <span style={{ color: T.text, fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0 }}>{t.topic}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: t.score >= 80 ? T.gold : t.score >= 60 ? T.teal : T.muted, fontFamily: 'var(--font-headline)' }}>{nf(t.score)}</span>
              </div>
              <ScoreBar score={t.score} />
              <div style={{ fontSize: 12, color: T.gold, marginTop: 6 }}>→ {t.angle}</div>
              {t.evidence && <div style={{ fontSize: 11, color: T.muted, marginTop: 3, fontStyle: 'italic' }}>{t.evidence}</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Google Trends · MX</SectionTitle>
        {googleTrends?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {googleTrends.map((g, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: T.text, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.keyword}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <TrendArrow trend={g.trend} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.textSec }}>{nf(g.avgScore)}/100</span>
                  </div>
                </div>
                <ScoreBar score={g.avgScore} showLabel={false} />
                {g.insight && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{g.insight}</div>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sin datos de Google Trends" sub="Configura LINKFOXAGENT_API_KEY para activar esta fuente" />
        )}
      </Card>
    </div>
  )
}

function ContentIdeasSection({ ideas }: { ideas: ContentIdea[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const sorted = [...ideas].sort((a, b) => b.urgency - a.urgency)

  return (
    <Card style={{ marginBottom: 'var(--space-4)' }}>
      <SectionTitle>Ideas de contenido</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((idea, i) => (
          <div key={i} style={{ border: `1px solid ${open === i ? T.gold + '55' : T.border}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s ease' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', background: open === i ? T.surface2 : 'transparent', border: 'none', padding: '14px 18px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, transition: 'background 0.15s ease' }}
            >
              <Ring score={idea.urgency} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.text, fontWeight: 600, fontSize: 14, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.title}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{idea.instalacion} · {idea.targetSegment}</div>
              </div>
              <FormatBadge format={idea.format} />
              <span style={{ color: T.muted, fontSize: 12, marginLeft: 6 }}>{open === i ? '▲' : '▼'}</span>
            </button>

            {open === i && (
              <div className="idea-detail" style={{ padding: '0 18px 18px' }}>
                {/* Hook */}
                <div style={{ background: T.surface2, borderRadius: 10, padding: '14px 16px', gridColumn: '1 / -1', borderLeft: `3px solid ${T.gold}` }}>
                  <div style={{ fontSize: 10, color: T.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Hook · {idea.hook.pattern}</div>
                  <div style={{ color: T.text, fontWeight: 600, fontSize: 15, fontFamily: 'var(--font-headline)', lineHeight: 1.4 }}>&ldquo;{idea.hook.text}&rdquo;</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {idea.hook.triggerWords?.map(w => <span key={w} style={{ background: T.gold + '22', color: T.gold, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{w}</span>)}
                  </div>
                </div>

                {/* Copy */}
                <div style={{ background: T.surface2, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Copy · {idea.copyStructure.framework}</div>
                  {[idea.copyStructure.step1, idea.copyStructure.step2, idea.copyStructure.step3].filter(Boolean).map((s, j) => (
                    <div key={j} style={{ fontSize: 13, color: T.textSec, marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${T.gold}44`, lineHeight: 1.5 }}>{s}</div>
                  ))}
                  <div style={{ fontSize: 13, color: T.gold, fontWeight: 600, marginTop: 8 }}>→ {idea.copyStructure.cta}</div>
                </div>

                {/* Plataformas */}
                <div style={{ background: T.surface2, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Brief por plataforma</div>
                  {Object.entries(idea.platforms ?? {}).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 12, color: T.textSec, marginBottom: 5, lineHeight: 1.5 }}>
                      <span style={{ color: T.gold, fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.8 }}>{k}</span>
                      <span style={{ color: T.muted }}> · </span>
                      {v as string}
                    </div>
                  ))}
                </div>

                {/* Hashtags + conexión tendencia */}
                <div style={{ background: T.surface2, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Hashtags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {idea.hashtags?.slice(0, 5).map(h => <HashTag key={h} tag={h} type="nicho" />)}
                  </div>
                  {idea.trendConnection && (
                    <div style={{ fontSize: 11, color: T.teal, marginTop: 6, fontStyle: 'italic' }}>↗ {idea.trendConnection}</div>
                  )}
                </div>

                {/* Música en tendencia — opciones para el admin */}
                {idea.music && idea.music.length > 0 && (
                  <div style={{ background: T.gold + '14', border: `1px solid ${T.gold}33`, borderRadius: 10, padding: '16px 18px', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 10, color: T.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>♪ Música trending — elige una opción</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {idea.music.map((m, mi) => (
                        <div key={mi} style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12, border: `1px solid ${T.border}` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.gold, minWidth: 18, paddingTop: 1 }}>{nf(mi + 1)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{m.title}</span>
                              <span style={{ fontSize: 12, color: T.textSec }}>— {m.artist}</span>
                              {m.bpm > 0 && <span style={{ fontSize: 10, color: T.muted, background: T.surface3, padding: '1px 7px', borderRadius: 10 }}>{nf(m.bpm)} BPM</span>}
                              <span style={{ fontSize: 11, color: T.gold, fontStyle: 'italic' }}>{m.mood}</span>
                            </div>
                            <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.4 }}>{m.why}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function StrategyAndSeason({ seasonality: s, strategy: st }: { seasonality: Report['seasonality']; strategy: Report['strategy'] }) {
  return (
    <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
      <Card>
        <SectionTitle>Estrategia de la semana</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: T.gold + '12', border: `1px solid ${T.gold}33`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: T.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Atacar primero</div>
            <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{st?.primarySegment}</div>
          </div>
          <div style={{ background: T.teal + '12', border: `1px solid ${T.teal}33`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: T.teal, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Mensaje</div>
            <div style={{ color: T.text, fontStyle: 'italic', fontSize: 15, fontFamily: 'var(--font-headline)', lineHeight: 1.4 }}>&ldquo;{st?.message}&rdquo;</div>
          </div>
          <div style={{ background: T.danger + '12', border: `1px solid ${T.danger}26`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: T.danger, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>Evitar</div>
            <div style={{ color: T.textSec, fontSize: 13 }}>{st?.avoid}</div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Temporada</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Flujo', value: s?.touristFlow },
            { label: 'Perfil', value: s?.dominantProfile },
            { label: 'Ventana', value: s?.peakWindow },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 10, color: T.muted, minWidth: 52, paddingTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
              <span style={{ fontSize: 13, color: T.text, flex: 1 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: T.teal + '14', borderRadius: 10, padding: '12px 14px', marginTop: 12, fontSize: 12, color: T.teal, lineHeight: 1.5, borderLeft: `3px solid ${T.teal}` }}>
          {s?.insight}
        </div>
      </Card>
    </div>
  )
}

function OpportunitiesAndViral({ opportunities, patterns }: { opportunities: Report['contentOpportunities']; patterns: Report['viralPatterns'] }) {
  const sorted = [...(opportunities ?? [])].sort((a, b) => b.urgencia - a.urgencia)
  return (
    <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
      <Card>
        <SectionTitle>Oportunidades por instalación</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 14, borderBottom: i < sorted.length - 1 ? `1px solid ${T.border}` : 'none' }}>
              <Ring score={o.urgencia} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{o.instalacion}</div>
                <div style={{ fontSize: 12, color: T.textSec, marginTop: 3, lineHeight: 1.4 }}>{o.oportunidad}</div>
                <div style={{ fontSize: 11, color: T.gold, marginTop: 4 }}>{o.formatoIdeal}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Patrones virales activos</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {patterns?.map((p, i) => (
            <div key={i} style={{ paddingLeft: 14, borderLeft: `2px solid ${T.gold}`, paddingBottom: 16, borderBottom: i < patterns.length - 1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{p.pattern}</div>
              <div style={{ fontSize: 12, color: T.textSec, marginBottom: 6, lineHeight: 1.5 }}>{p.description}</div>
              <div style={{ fontSize: 12, color: T.teal }}>Para Bahía: {p.adaptForBahia}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function HashtagsSection({ hashtags: h }: { hashtags: Report['hashtags'] }) {
  return (
    <Card style={{ marginBottom: 'var(--space-4)' }}>
      <SectionTitle>Hashtags recomendados</SectionTitle>
      <div className="grid-3" style={{ marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Masivos', items: h?.masivos, type: 'masivo' as const, color: T.info },
          { label: 'Nicho', items: h?.nicho, type: 'nicho' as const, color: T.teal },
          { label: 'Locales', items: h?.locales, type: 'local' as const, color: T.gold },
        ].map(({ label, items, type, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {items?.map(t => <HashTag key={t} tag={t} type={type} />)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: T.textSec, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
        {h?.mixRecomendado}
      </div>
    </Card>
  )
}

function CompetitiveSection({ competitive: c }: { competitive: Report['competitive'] }) {
  return (
    <Card style={{ marginBottom: 'var(--space-4)' }}>
      <SectionTitle>Inteligencia competitiva</SectionTitle>
      <div className="grid-3">
        <div style={{ background: T.surface2, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Competidores</div>
          {c?.topCompetitors?.map((comp, i) => (
            <div key={i} style={{ fontSize: 13, color: T.textSec, marginBottom: 6, display: 'flex', gap: 8 }}>
              <span style={{ color: T.danger }}>•</span> {comp}
            </div>
          ))}
        </div>
        <div style={{ background: T.surface2, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Su ángulo</div>
          <div style={{ fontSize: 13, color: T.textSec, marginBottom: 12, lineHeight: 1.5 }}>{c?.theirAngle}</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>El gap</div>
          <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5 }}>{c?.gap}</div>
        </div>
        <div style={{ background: T.gold + '12', border: `1px solid ${T.gold}33`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: T.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Nuestra ventaja</div>
          <div style={{ fontSize: 13, color: T.text, fontWeight: 600, lineHeight: 1.5 }}>{c?.counterPositioning}</div>
        </div>
      </div>
    </Card>
  )
}

// ─── Esqueleto de carga (espeja la forma del contenido real) ───────────────────

function TendenciasSkeleton() {
  return (
    <div role="status" aria-label="Cargando reporte" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* KPIs */}
      <div className="grid-kpis">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="metric-card" style={{ minWidth: 0 }}>
            <Skeleton height={10} width="55%" />
            <Skeleton height={28} width="40%" radius="var(--radius-md)" />
            <Skeleton height={12} width="70%" />
          </div>
        ))}
      </div>
      {/* Tendencias + Google Trends */}
      <div className="trends-split">
        {Array.from({ length: 2 }).map((_, c) => (
          <Card key={c}>
            <Skeleton height={10} width="35%" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <Skeleton height={14} width={`${85 - i * 8}%`} />
                  <Skeleton height={4} radius="var(--radius-full)" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {/* Lista de ideas */}
      <Card>
        <Skeleton height={10} width="25%" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '14px 18px', border: `1px solid ${T.border}`, borderRadius: 'var(--radius-lg)' }}>
              <Skeleton height={44} width={44} radius="var(--radius-full)" />
              <div style={{ flex: 1 }}><SkeletonText lines={2} /></div>
              <Skeleton height={20} width={64} radius="var(--radius-full)" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function TendenciasPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeAgo, setTimeAgo] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/tendencias/report')
      if (res.ok) {
        const data = await res.json()
        setReport(data.report)
        setGeneratedAt(data.generatedAt)
        setError(null)
      } else {
        setError('Sin reporte')
      }
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchReport() }, [fetchReport])

  async function generate() {
    setGenerating(true)
    try {
      // Espera la respuesta directamente — la función tarda 1-3 min pero regresa cuando termina
      const r = await fetch('/api/agents/tendencias', { signal: AbortSignal.timeout(290_000) })
      if (r.ok) {
        const d = await r.json()
        // La ruta devuelve el análisis directamente con campos: contentIdeas, trends, etc.
        if (d.contentIdeas || d.trends || d.period) {
          setReport(d)
          setGeneratedAt(new Date().toISOString())
          setError(null)
          setGenerating(false)
          return
        }
      }
    } catch { /* timeout o error de red — intenta leer el reporte guardado */ }
    // Fallback: leer el reporte más reciente de Supabase
    try {
      const r2 = await fetch('/api/agents/tendencias/report')
      if (r2.ok) {
        const d2 = await r2.json()
        setReport(d2.report)
        setGeneratedAt(d2.generatedAt)
        setError(null)
      }
    } catch { /* sin reporte disponible */ }
    setGenerating(false)
  }

  useEffect(() => {
    const compute = () => {
      if (!generatedAt) { setTimeAgo(null); return }
      const mins = Math.floor((Date.now() - new Date(generatedAt).getTime()) / 60000)
      setTimeAgo(mins < 1 ? 'ahora' : mins < 60 ? `${mins}min` : `${Math.floor(mins / 60)}h`)
    }
    compute()
    const id = setInterval(compute, 60000)
    return () => clearInterval(id)
  }, [generatedAt])

  const actions = (
    <>
      {timeAgo && <span style={{ fontSize: 11, color: T.muted }}>↻ {timeAgo}</span>}
      {generating && (
        <span style={{ fontSize: 11, color: T.gold, background: T.gold + '1f', padding: '5px 12px', borderRadius: 20, border: `1px solid ${T.gold}4d` }}>
          Generando…
        </span>
      )}
      <button className="btn btn-secondary" onClick={fetchReport}>Actualizar</button>
      <button className="btn btn-primary" onClick={generate} disabled={generating}>Nuevo reporte</button>
    </>
  )

  return (
    <div>
      {/* Grids responsivos locales (no tocan globals.css) */}
      <style>{`
        .trends-split { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: var(--space-4); }
        .idea-detail { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-3); }
        @media (max-width: 900px) {
          .trends-split, .idea-detail { grid-template-columns: 1fr; }
        }
      `}</style>

      <PageHeader
        title="Tendencias"
        blurb="Briefing semanal de tendencias, ideas de contenido y estrategia para Bahía Social Sports Club."
        actions={actions}
      />

      {loading && <TendenciasSkeleton />}

      {!loading && error && !report && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)' }}>
          <EmptyState title="Sin reporte generado" sub="Genera el primero con el botón — tarda ~90s" />
          <button className="btn btn-primary" onClick={generate} disabled={generating}>
            {generating ? 'Generando…' : 'Generar reporte'}
          </button>
        </div>
      )}

      {report && (
        <>
          <HeroStats report={report} />
          <TrendsSection trends={report.trends} googleTrends={report.googleTrends} />
          <ContentIdeasSection ideas={report.contentIdeas} />
          <StrategyAndSeason seasonality={report.seasonality} strategy={report.strategy} />
          <OpportunitiesAndViral opportunities={report.contentOpportunities} patterns={report.viralPatterns} />
          <HashtagsSection hashtags={report.hashtags} />
          <CompetitiveSection competitive={report.competitive} />
        </>
      )}
    </div>
  )
}
