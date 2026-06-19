'use client'
import { useState, useEffect, useCallback } from 'react'
import { UserButton } from '@clerk/nextjs'

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

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: '#070710',
  surface: '#0f0f1a',
  card: '#13131f',
  cardHover: '#171724',
  border: '#1e1e32',
  borderLight: '#2a2a45',
  accent: '#6c5ce7',
  accentBright: '#7c6dff',
  accentGlow: '#6c5ce720',
  green: '#00d4aa',
  greenGlow: '#00d4aa18',
  amber: '#f0a500',
  amberGlow: '#f0a50015',
  red: '#ff4757',
  redGlow: '#ff475718',
  text: '#e8e8f2',
  textSoft: '#a0a0c0',
  muted: '#50507a',
}

const FORMAT_COLOR: Record<string, string> = {
  Reel: '#ff4757',
  TikTok: '#00d4aa',
  Carrusel: '#6c5ce7',
  Story: '#f0a500',
  Stories: '#f0a500',
  Post: '#00b4d8',
}

// ─── Primitivos ───────────────────────────────────────────────────────────────

function Ring({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(score / 10, 1)
  const color = pct >= 0.8 ? C.green : pct >= 0.5 ? C.amber : C.red
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color} fontSize={13} fontWeight={700}>{score}</text>
    </svg>
  )
}

function ScoreBar({ score, max = 100, showLabel = true }: { score: number; max?: number; showLabel?: boolean }) {
  const pct = (score / max) * 100
  const color = pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
      {showLabel && <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 28, textAlign: 'right' }}>{score}</span>}
    </div>
  )
}

function FormatBadge({ format }: { format: string }) {
  const color = FORMAT_COLOR[format] ?? C.muted
  return (
    <span style={{ background: color + '20', color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>
      {format}
    </span>
  )
}

function HashTag({ tag, type = 'nicho' }: { tag: string; type?: 'masivo' | 'nicho' | 'local' }) {
  const colors = { masivo: C.accentBright, nicho: C.green, local: C.amber }
  const c = colors[type]
  return (
    <span style={{ background: c + '15', color: c, fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
      {tag}
    </span>
  )
}

function TrendArrow({ trend }: { trend: string }) {
  const up = trend === 'subiendo'
  const down = trend === 'bajando'
  const color = up ? C.green : down ? C.red : C.amber
  const arrow = up ? '↑' : down ? '↓' : '→'
  return <span style={{ color, fontWeight: 700, fontSize: 13 }}>{arrow}</span>
}

function StatCard({ label, value, sub, color = C.accentBright }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', flex: 1 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function HeroStats({ report }: { report: Report }) {
  const topScore = Math.max(...(report.trends?.map(t => t.score) ?? [0]))
  const ideas = report.contentIdeas?.length ?? 0
  const topUrgency = Math.max(...(report.contentIdeas?.map(i => i.urgency) ?? [0]))
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      <StatCard label="Tendencia top" value={topScore} sub={report.trends?.[0]?.topic} color={C.green} />
      <StatCard label="Ideas listas" value={ideas} sub={`${report.contentIdeas?.filter(i => i.urgency >= 8).length ?? 0} urgentes`} color={C.accentBright} />
      <StatCard label="Urgencia máx" value={`${topUrgency}/10`} sub={report.contentIdeas?.find(i => i.urgency === topUrgency)?.format} color={C.amber} />
      <StatCard label="Período" value={report.period?.split(' ')[0]} sub={report.period?.split(' ').slice(1).join(' ')} color={C.textSoft} />
    </div>
  )
}

function TrendsSection({ trends, googleTrends }: { trends: Trend[]; googleTrends: GTrend[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
      {/* Perplexity trends */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📡 Tendencias · Perplexity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {trends?.map((t, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, minWidth: 16 }}>#{i + 1}</span>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 14, flex: 1 }}>{t.topic}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: t.score >= 80 ? C.green : t.score >= 60 ? C.amber : C.red }}>{t.score}</span>
              </div>
              <ScoreBar score={t.score} />
              <div style={{ fontSize: 12, color: C.accentBright, marginTop: 5 }}>→ {t.angle}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Trends */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>🔍 Google Trends · MX</div>
        {googleTrends?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {googleTrends.map((g, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{g.keyword}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendArrow trend={g.trend} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textSoft }}>{g.avgScore}/100</span>
                  </div>
                </div>
                <ScoreBar score={g.avgScore} showLabel={false} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', paddingTop: 20 }}>
            Sin datos<br /><span style={{ fontSize: 11 }}>Configura LINKFOXAGENT_API_KEY</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ContentIdeasSection({ ideas }: { ideas: ContentIdea[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const sorted = [...ideas].sort((a, b) => b.urgency - a.urgency)

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>💡 Ideas de contenido</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((idea, i) => (
          <div key={i} style={{ border: `1px solid ${open === i ? C.accentBright + '60' : C.border}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', background: open === i ? C.accentGlow : 'transparent', border: 'none', padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <Ring score={idea.urgency} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 13, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.title}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{idea.instalacion} · {idea.targetSegment}</div>
              </div>
              <FormatBadge format={idea.format} />
              <span style={{ color: C.muted, fontSize: 14, marginLeft: 6 }}>{open === i ? '▲' : '▼'}</span>
            </button>

            {open === i && (
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Hook · {idea.hook.pattern}</div>
                  <div style={{ color: C.accentBright, fontWeight: 600, fontSize: 14 }}>"{idea.hook.text}"</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {idea.hook.triggerWords?.map(w => <span key={w} style={{ background: C.accentGlow, color: C.accentBright, fontSize: 11, padding: '1px 8px', borderRadius: 4 }}>{w}</span>)}
                  </div>
                </div>
                <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Copy · {idea.copyStructure.framework}</div>
                  {[idea.copyStructure.step1, idea.copyStructure.step2, idea.copyStructure.step3].filter(Boolean).map((s, j) => (
                    <div key={j} style={{ fontSize: 12, color: C.textSoft, marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${C.accentBright}40` }}>{s}</div>
                  ))}
                  <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginTop: 6 }}>→ {idea.copyStructure.cta}</div>
                </div>
                <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Plataformas</div>
                  {Object.entries(idea.platforms ?? {}).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 11, color: C.textSoft, marginBottom: 3 }}><span style={{ color: C.muted }}>{k}:</span> {v as string}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'flex-start', background: C.bg, borderRadius: 8, padding: '12px 14px' }}>
                  {idea.hashtags?.slice(0, 6).map(h => <HashTag key={h} tag={h} type="nicho" />)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StrategyAndSeason({ seasonality: s, strategy: st }: { seasonality: Report['seasonality']; strategy: Report['strategy'] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>🎯 Estrategia</div>
        <div style={{ background: C.greenGlow, border: `1px solid ${C.green}30`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.green, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Atacar primero</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{st?.primarySegment}</div>
        </div>
        <div style={{ background: C.accentGlow, border: `1px solid ${C.accentBright}30`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.accentBright, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Mensaje</div>
          <div style={{ color: C.text, fontStyle: 'italic', fontSize: 13 }}>"{st?.message}"</div>
        </div>
        <div style={{ background: C.redGlow, border: `1px solid ${C.red}30`, borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: C.red, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Evitar</div>
          <div style={{ color: C.textSoft, fontSize: 12 }}>{st?.avoid}</div>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>🌊 Temporada</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Flujo', value: s?.touristFlow },
            { label: 'Perfil', value: s?.dominantProfile },
            { label: 'Ventana', value: s?.peakWindow },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, color: C.muted, minWidth: 50, paddingTop: 1 }}>{label}</span>
              <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.accentGlow, borderRadius: 10, padding: '10px 14px', marginTop: 14, fontSize: 12, color: C.accentBright }}>
          💡 {s?.insight}
        </div>
      </div>
    </div>
  )
}

function OpportunitiesAndViral({ opportunities, patterns }: { opportunities: Report['contentOpportunities']; patterns: Report['viralPatterns'] }) {
  const sorted = [...(opportunities ?? [])].sort((a, b) => b.urgencia - a.urgencia)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📸 Oportunidades</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Ring score={o.urgencia} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{o.instalacion}</div>
                <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>{o.oportunidad}</div>
                <div style={{ fontSize: 11, color: C.accentBright, marginTop: 2 }}>{o.formatoIdeal}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>🔥 Patrones virales</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {patterns?.map((p, i) => (
            <div key={i} style={{ paddingLeft: 12, borderLeft: `2px solid ${C.accentBright}50` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{p.pattern}</div>
              <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 3 }}>{p.description}</div>
              <div style={{ fontSize: 12, color: C.green }}>Para Bahía: {p.adaptForBahia}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HashtagsSection({ hashtags: h }: { hashtags: Report['hashtags'] }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}># Hashtags recomendados</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 12 }}>
        {[
          { label: 'Masivos', items: h?.masivos, type: 'masivo' as const },
          { label: 'Nicho', items: h?.nicho, type: 'nicho' as const },
          { label: 'Locales', items: h?.locales, type: 'local' as const },
        ].map(({ label, items, type }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {items?.map(t => <HashTag key={t} tag={t} type={type} />)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.textSoft, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        📐 {h?.mixRecomendado}
      </div>
    </div>
  )
}

function CompetitiveSection({ competitive: c }: { competitive: Report['competitive'] }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>🔍 Inteligencia competitiva</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Competidores</div>
          {c?.topCompetitors?.map((comp, i) => (
            <div key={i} style={{ fontSize: 12, color: C.textSoft, marginBottom: 4, display: 'flex', gap: 6 }}>
              <span style={{ color: C.red }}>•</span> {comp}
            </div>
          ))}
        </div>
        <div style={{ background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Su ángulo</div>
          <div style={{ fontSize: 12, color: C.textSoft }}>{c?.theirAngle}</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 }}>El gap</div>
          <div style={{ fontSize: 12, color: C.textSoft }}>{c?.gap}</div>
        </div>
        <div style={{ background: C.greenGlow, border: `1px solid ${C.green}30`, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: C.green, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Nuestra ventaja</div>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{c?.counterPositioning}</div>
        </div>
      </div>
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

  useEffect(() => { fetchReport() }, [fetchReport])

  async function generate() {
    setGenerating(true)
    const startedAt = new Date().toISOString()
    fetch('/api/agents/tendencias').catch(() => {})
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
          }
        }
      } catch { /* sigue */ }
      if (attempts >= 42) { setGenerating(false); clearInterval(poll) }
    }, 10000)
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

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.text }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Bahía</span>
          <span style={{ fontSize: 13, color: C.muted }}>/ Tendencias</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {timeAgo && <span style={{ fontSize: 12, color: C.muted }}>↻ {timeAgo}</span>}
          {generating && (
            <span style={{ fontSize: 12, color: C.amber, background: C.amberGlow, padding: '4px 10px', borderRadius: 6 }}>
              ⚙ Generando...
            </span>
          )}
          <button onClick={fetchReport} style={{ background: C.card, color: C.textSoft, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12 }}>
            ↻
          </button>
          <button
            onClick={generate}
            disabled={generating}
            style={{ background: generating ? C.border : C.accentBright, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: generating ? 'default' : 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Nuevo reporte
          </button>
          <UserButton />
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: C.muted, fontSize: 14 }}>Cargando...</div>
        )}

        {!loading && error && !report && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>Sin reporte</div>
            <div style={{ color: C.muted, marginTop: 8, marginBottom: 24, fontSize: 13 }}>Genera el primero con el botón de arriba — tarda ~90s</div>
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
    </div>
  )
}
