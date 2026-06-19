'use client'
import { useState, useEffect, useCallback } from 'react'
import { UserButton } from '@clerk/nextjs'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Paleta oficial Bahía ─────────────────────────────────────────────────────

const C = {
  bg: '#f6f6f6',         // crema oficial
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#f0f0f0',
  border: '#e4e4e4',
  borderLight: '#ececec',
  blue: '#37519f',       // azul primario oficial
  blueLight: '#4a67b8',
  blueFaint: '#37519f12',
  gold: '#8e8055',       // oro/oliva oficial
  goldFaint: '#8e805518',
  sage: '#7a8a79',       // sage verde oficial
  sageFaint: '#7a8a7914',
  red: '#c0392b',
  redFaint: '#c0392b10',
  text: '#1a2040',       // azul muy oscuro para texto
  textSoft: '#4a5580',
  muted: '#8e9ab5',
}

const FORMAT_COLOR: Record<string, string> = {
  Reel: '#c0392b',
  TikTok: '#7a8a79',
  Carrusel: '#37519f',
  Story: '#8e8055',
  Stories: '#8e8055',
  Post: '#4a67b8',
}

// ─── Fuentes Bahía (Google Fonts) ─────────────────────────────────────────────

const fontLink = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
`

// ─── Primitivos ───────────────────────────────────────────────────────────────

function Ring({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(score / 10, 1)
  const color = pct >= 0.8 ? C.blue : pct >= 0.5 ? C.gold : C.sage
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color} fontSize={12} fontWeight={700} fontFamily="DM Sans">{score}</text>
    </svg>
  )
}

function ScoreBar({ score, max = 100, showLabel = true }: { score: number; max?: number; showLabel?: boolean }) {
  const pct = (score / max) * 100
  const color = pct >= 70 ? C.blue : pct >= 40 ? C.gold : C.sage
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      {showLabel && <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28, textAlign: 'right', fontFamily: 'DM Sans' }}>{score}</span>}
    </div>
  )
}

function FormatBadge({ format }: { format: string }) {
  const color = FORMAT_COLOR[format] ?? C.muted
  return (
    <span style={{ background: color + '15', color, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: 'DM Sans' }}>
      {format}
    </span>
  )
}

function HashTag({ tag, type = 'nicho' }: { tag: string; type?: 'masivo' | 'nicho' | 'local' }) {
  const colors = { masivo: C.blue, nicho: C.sage, local: C.gold }
  const c = colors[type]
  return (
    <span style={{ background: c + '12', color: c, fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 500, fontFamily: 'DM Sans', border: `1px solid ${c}25`, transition: 'background 0.15s ease' }}>
      {tag}
    </span>
  )
}

function TrendArrow({ trend }: { trend: string }) {
  const up = trend === 'subiendo'
  const down = trend === 'bajando'
  const color = up ? C.blue : down ? C.red : C.gold
  const arrow = up ? '↑' : down ? '↓' : '→'
  return <span style={{ color, fontWeight: 700, fontSize: 13 }}>{arrow}</span>
}

function StatCard({ label, value, sub, color = C.blue }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '22px 24px', flex: 1, boxShadow: '0 1px 4px rgba(55,81,159,0.06)', transition: 'box-shadow 0.2s ease, transform 0.2s ease' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(55,81,159,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(55,81,159,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontFamily: 'DM Sans', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color, letterSpacing: -1, fontFamily: 'Cormorant Garamond', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textSoft, marginTop: 6, fontFamily: 'DM Sans' }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 18, fontFamily: 'DM Sans', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 20, height: 1, background: C.blue + '60', display: 'inline-block' }} />
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(55,81,159,0.05)', ...style }}>
      {children}
    </div>
  )
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function HeroStats({ report }: { report: Report }) {
  const topScore = Math.max(...(report.trends?.map(t => t.score) ?? [0]))
  const ideas = report.contentIdeas?.length ?? 0
  const topUrgency = Math.max(...(report.contentIdeas?.map(i => i.urgency) ?? [0]))
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
      <StatCard label="Tendencia top" value={topScore} sub={report.trends?.[0]?.topic} color={C.blue} />
      <StatCard label="Ideas listas" value={ideas} sub={`${report.contentIdeas?.filter(i => i.urgency >= 8).length ?? 0} urgentes`} color={C.gold} />
      <StatCard label="Urgencia máx" value={`${topUrgency}/10`} sub={report.contentIdeas?.find(i => i.urgency === topUrgency)?.format} color={C.sage} />
      <StatCard label="Período" value={report.period?.split(' ')[0]} sub={report.period?.split(' ').slice(1).join(' ')} color={C.muted} />
    </div>
  )
}

function TrendsSection({ trends, googleTrends }: { trends: Trend[]; googleTrends: GTrend[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
      <Card>
        <SectionTitle>Tendencias · Perplexity</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {trends?.map((t, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, minWidth: 16, fontFamily: 'DM Sans' }}>#{i + 1}</span>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 14, flex: 1, fontFamily: 'DM Sans' }}>{t.topic}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: t.score >= 80 ? C.blue : t.score >= 60 ? C.gold : C.sage, fontFamily: 'Cormorant Garamond' }}>{t.score}</span>
              </div>
              <ScoreBar score={t.score} />
              <div style={{ fontSize: 12, color: C.blue, marginTop: 6, fontFamily: 'DM Sans' }}>→ {t.angle}</div>
              {t.evidence && <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: 'DM Sans', fontStyle: 'italic' }}>{t.evidence}</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Google Trends · MX</SectionTitle>
        {googleTrends?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {googleTrends.map((g, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 500, fontFamily: 'DM Sans' }}>{g.keyword}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendArrow trend={g.trend} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textSoft, fontFamily: 'DM Sans' }}>{g.avgScore}/100</span>
                  </div>
                </div>
                <ScoreBar score={g.avgScore} showLabel={false} />
                {g.insight && <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'DM Sans' }}>{g.insight}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', paddingTop: 24, fontFamily: 'DM Sans', lineHeight: 1.6 }}>
            Sin datos de Google Trends<br /><span style={{ fontSize: 11 }}>Configura LINKFOXAGENT_API_KEY</span>
          </div>
        )}
      </Card>
    </div>
  )
}

function ContentIdeasSection({ ideas }: { ideas: ContentIdea[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const sorted = [...ideas].sort((a, b) => b.urgency - a.urgency)

  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionTitle>Ideas de contenido</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((idea, i) => (
          <div key={i} style={{ border: `1px solid ${open === i ? C.blue + '50' : C.border}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s ease' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', background: open === i ? C.blueFaint : 'transparent', border: 'none', padding: '14px 18px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, transition: 'background 0.15s ease' }}
            >
              <Ring score={idea.urgency} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'DM Sans' }}>{idea.title}</div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans' }}>{idea.instalacion} · {idea.targetSegment}</div>
              </div>
              <FormatBadge format={idea.format} />
              <span style={{ color: C.muted, fontSize: 12, marginLeft: 6 }}>{open === i ? '▲' : '▼'}</span>
            </button>

            {open === i && (
              <div style={{ padding: '0 18px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Hook */}
                <div style={{ background: C.blueFaint, borderRadius: 10, padding: '14px 16px', gridColumn: '1 / -1', borderLeft: `3px solid ${C.blue}` }}>
                  <div style={{ fontSize: 10, color: C.blue, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans', fontWeight: 600 }}>Hook · {idea.hook.pattern}</div>
                  <div style={{ color: C.text, fontWeight: 600, fontSize: 15, fontFamily: 'Cormorant Garamond', lineHeight: 1.4 }}>&ldquo;{idea.hook.text}&rdquo;</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {idea.hook.triggerWords?.map(w => <span key={w} style={{ background: C.blue + '18', color: C.blue, fontSize: 11, padding: '2px 8px', borderRadius: 4, fontFamily: 'DM Sans' }}>{w}</span>)}
                  </div>
                </div>

                {/* Copy */}
                <div style={{ background: C.bg, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans', fontWeight: 600 }}>Copy · {idea.copyStructure.framework}</div>
                  {[idea.copyStructure.step1, idea.copyStructure.step2, idea.copyStructure.step3].filter(Boolean).map((s, j) => (
                    <div key={j} style={{ fontSize: 13, color: C.textSoft, marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${C.blue}30`, fontFamily: 'DM Sans', lineHeight: 1.5 }}>{s}</div>
                  ))}
                  <div style={{ fontSize: 13, color: C.blue, fontWeight: 600, marginTop: 8, fontFamily: 'DM Sans' }}>→ {idea.copyStructure.cta}</div>
                </div>

                {/* Plataformas */}
                <div style={{ background: C.bg, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans', fontWeight: 600 }}>Brief por plataforma</div>
                  {Object.entries(idea.platforms ?? {}).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 12, color: C.textSoft, marginBottom: 5, fontFamily: 'DM Sans', lineHeight: 1.5 }}>
                      <span style={{ color: C.gold, fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.8 }}>{k}</span>
                      <span style={{ color: C.muted }}> · </span>
                      {v as string}
                    </div>
                  ))}
                </div>

                {/* Hashtags + conexión tendencia */}
                <div style={{ background: C.bg, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans', fontWeight: 600 }}>Hashtags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {idea.hashtags?.slice(0, 5).map(h => <HashTag key={h} tag={h} type="nicho" />)}
                  </div>
                  {idea.trendConnection && (
                    <div style={{ fontSize: 11, color: C.sage, fontFamily: 'DM Sans', marginTop: 6, fontStyle: 'italic' }}>↗ {idea.trendConnection}</div>
                  )}
                </div>

                {/* Música en tendencia — opciones para el admin */}
                {idea.music && idea.music.length > 0 && (
                  <div style={{ background: C.goldFaint, border: `1px solid ${C.gold}25`, borderRadius: 10, padding: '16px 18px', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 10, color: C.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'DM Sans', fontWeight: 600 }}>♪ Música trending — elige una opción</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {idea.music.map((m, mi) => (
                        <div key={mi} style={{ background: C.surface, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12, border: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, minWidth: 18, paddingTop: 1, fontFamily: 'DM Sans' }}>{mi + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'DM Sans' }}>{m.title}</span>
                              <span style={{ fontSize: 12, color: C.textSoft, fontFamily: 'DM Sans' }}>— {m.artist}</span>
                              {m.bpm > 0 && <span style={{ fontSize: 10, color: C.muted, background: C.border, padding: '1px 7px', borderRadius: 10, fontFamily: 'DM Sans' }}>{m.bpm} BPM</span>}
                              <span style={{ fontSize: 11, color: C.gold, fontStyle: 'italic', fontFamily: 'DM Sans' }}>{m.mood}</span>
                            </div>
                            <div style={{ fontSize: 12, color: C.textSoft, fontFamily: 'DM Sans', lineHeight: 1.4 }}>{m.why}</div>
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <Card>
        <SectionTitle>Estrategia de la semana</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: C.blueFaint, border: `1px solid ${C.blue}20`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.blue, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans', fontWeight: 600 }}>Atacar primero</div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15, fontFamily: 'DM Sans' }}>{st?.primarySegment}</div>
          </div>
          <div style={{ background: C.goldFaint, border: `1px solid ${C.gold}20`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans', fontWeight: 600 }}>Mensaje</div>
            <div style={{ color: C.text, fontStyle: 'italic', fontSize: 15, fontFamily: 'Cormorant Garamond', lineHeight: 1.4 }}>&ldquo;{st?.message}&rdquo;</div>
          </div>
          <div style={{ background: C.redFaint, border: `1px solid ${C.red}15`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: C.red, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'DM Sans', fontWeight: 600 }}>Evitar</div>
            <div style={{ color: C.textSoft, fontSize: 13, fontFamily: 'DM Sans' }}>{st?.avoid}</div>
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
            <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, color: C.muted, minWidth: 52, paddingTop: 2, fontFamily: 'DM Sans', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
              <span style={{ fontSize: 13, color: C.text, flex: 1, fontFamily: 'DM Sans' }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.sageFaint, borderRadius: 10, padding: '12px 14px', marginTop: 12, fontSize: 12, color: C.sage, fontFamily: 'DM Sans', lineHeight: 1.5, borderLeft: `3px solid ${C.sage}` }}>
          {s?.insight}
        </div>
      </Card>
    </div>
  )
}

function OpportunitiesAndViral({ opportunities, patterns }: { opportunities: Report['contentOpportunities']; patterns: Report['viralPatterns'] }) {
  const sorted = [...(opportunities ?? [])].sort((a, b) => b.urgencia - a.urgencia)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <Card>
        <SectionTitle>Oportunidades por instalación</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 14, borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <Ring score={o.urgencia} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'DM Sans' }}>{o.instalacion}</div>
                <div style={{ fontSize: 12, color: C.textSoft, marginTop: 3, fontFamily: 'DM Sans', lineHeight: 1.4 }}>{o.oportunidad}</div>
                <div style={{ fontSize: 11, color: C.blue, marginTop: 4, fontFamily: 'DM Sans' }}>{o.formatoIdeal}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Patrones virales activos</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {patterns?.map((p, i) => (
            <div key={i} style={{ paddingLeft: 14, borderLeft: `2px solid ${C.gold}`, paddingBottom: 16, borderBottom: i < patterns.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: 'DM Sans' }}>{p.pattern}</div>
              <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 6, fontFamily: 'DM Sans', lineHeight: 1.5 }}>{p.description}</div>
              <div style={{ fontSize: 12, color: C.sage, fontFamily: 'DM Sans' }}>Para Bahía: {p.adaptForBahia}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function HashtagsSection({ hashtags: h }: { hashtags: Report['hashtags'] }) {
  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionTitle>Hashtags recomendados</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 14 }}>
        {[
          { label: 'Masivos', items: h?.masivos, type: 'masivo' as const, color: C.blue },
          { label: 'Nicho', items: h?.nicho, type: 'nicho' as const, color: C.sage },
          { label: 'Locales', items: h?.locales, type: 'local' as const, color: C.gold },
        ].map(({ label, items, type, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'DM Sans', fontWeight: 600 }}>{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {items?.map(t => <HashTag key={t} tag={t} type={type} />)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.textSoft, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontFamily: 'DM Sans' }}>
        {h?.mixRecomendado}
      </div>
    </Card>
  )
}

function CompetitiveSection({ competitive: c }: { competitive: Report['competitive'] }) {
  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionTitle>Inteligencia competitiva</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div style={{ background: C.bg, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'DM Sans', fontWeight: 600 }}>Competidores</div>
          {c?.topCompetitors?.map((comp, i) => (
            <div key={i} style={{ fontSize: 13, color: C.textSoft, marginBottom: 6, display: 'flex', gap: 8, fontFamily: 'DM Sans' }}>
              <span style={{ color: C.red }}>•</span> {comp}
            </div>
          ))}
        </div>
        <div style={{ background: C.bg, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans', fontWeight: 600 }}>Su ángulo</div>
          <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 12, fontFamily: 'DM Sans', lineHeight: 1.5 }}>{c?.theirAngle}</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans', fontWeight: 600 }}>El gap</div>
          <div style={{ fontSize: 13, color: C.textSoft, fontFamily: 'DM Sans', lineHeight: 1.5 }}>{c?.gap}</div>
        </div>
        <div style={{ background: C.blueFaint, border: `1px solid ${C.blue}20`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: C.blue, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans', fontWeight: 600 }}>Nuestra ventaja</div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 600, fontFamily: 'DM Sans', lineHeight: 1.5 }}>{c?.counterPositioning}</div>
        </div>
      </div>
    </Card>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

type CriticoReport = {
  verdict: string; score: number
  campañasDestacadas: { id: string; veredicto: string; calificacion: 'A'|'B'|'C'|'D'|'F'; razon: string; mejorar: string }[]
  patronesDetectados: string[]
  problemas: { problema: string; impacto: 'alto' | 'medio' | 'bajo'; evidencia: string }[]
  accionesInmediatas: string[]
  alertas: { nivel: 'rojo' | 'amarillo' | 'verde'; mensaje: string }[]
}
type CampañaCalificada = {
  id: string; tipo: string; titulo: string; instalacion: string; hook: string
  status: string; hasCampaign: boolean; aiScore: number | null
  leadsAtribuidos: number; leadsCitados: number; leadsCerrados: number; leadsFrios: number
  tasaConversion: number; tasaFrio: number; interaccionPromedio: number
  calidad: 'alta' | 'media' | 'baja' | 'sin-datos'; createdAt: string
}
type CriticoData = {
  campañas: CampañaCalificada[]
  resumen: { totalLeads: number; totalCerrados: number; totalCitados: number; totalFrios: number; leadsOrganicos: number; totalCreativos: number }
  report: CriticoReport | null
  generatedAt: string
}

export default function Dashboard() {
  const [report, setReport] = useState<Report | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeAgo, setTimeAgo] = useState<string | null>(null)
  const [critico, setCritico] = useState<CriticoData | null>(null)
  const [criticoLoading, setCriticoLoading] = useState(false)

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

  const fetchCritico = useCallback(async () => {
    setCriticoLoading(true)
    try {
      const res = await fetch('/api/agents/critico')
      if (res.ok) setCritico(await res.json())
    } finally {
      setCriticoLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchReport(); fetchCritico() }, [fetchReport, fetchCritico])

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
      if (attempts >= 60) { setGenerating(false); clearInterval(poll) } // 10 min máx
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
    <>
      <style>{fontLink}</style>
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'DM Sans, -apple-system, sans-serif', color: C.text }}>

        {/* Header */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue, boxShadow: `0 0 6px ${C.blue}80` }} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Cormorant Garamond', color: C.blue }}>Bahía</span>
            <span style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontFamily: 'DM Sans' }}>/ Tendencias</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {timeAgo && <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans' }}>↻ {timeAgo}</span>}
            {generating && (
              <span style={{ fontSize: 11, color: C.gold, background: C.goldFaint, padding: '5px 12px', borderRadius: 20, fontFamily: 'DM Sans', border: `1px solid ${C.gold}30` }}>
                Generando reporte...
              </span>
            )}
            <button
              onClick={fetchReport}
              style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue + '60'; (e.currentTarget as HTMLButtonElement).style.color = C.blue }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.muted }}
            >
              ↻
            </button>
            <button
              onClick={generate}
              disabled={generating}
              style={{ background: generating ? C.border : C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', cursor: generating ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans', transition: 'background 0.15s ease, transform 0.1s ease', letterSpacing: 0.3 }}
              onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLButtonElement).style.background = C.blueLight }}
              onMouseLeave={e => { if (!generating) (e.currentTarget as HTMLButtonElement).style.background = C.blue }}
            >
              Nuevo reporte
            </button>
            <UserButton />
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 24px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 100, color: C.muted, fontSize: 14, fontFamily: 'DM Sans' }}>Cargando...</div>
          )}

          {!loading && error && !report && (
            <div style={{ textAlign: 'center', padding: 100 }}>
              <div style={{ fontSize: 40, marginBottom: 20, color: C.blue, fontFamily: 'Cormorant Garamond' }}>∿</div>
              <div style={{ color: C.text, fontSize: 18, fontWeight: 600, fontFamily: 'Cormorant Garamond' }}>Sin reporte generado</div>
              <div style={{ color: C.muted, marginTop: 8, marginBottom: 28, fontSize: 13, fontFamily: 'DM Sans' }}>Genera el primero con el botón de arriba — tarda ~90s</div>
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

        {/* ── Agente Crítico ───────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <SectionTitle label="Evaluación del sistema" />
            <button
              onClick={fetchCritico}
              disabled={criticoLoading}
              style={{ background: criticoLoading ? C.border : C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 16px', fontSize: 12, color: C.textSoft, cursor: criticoLoading ? 'default' : 'pointer', fontFamily: 'DM Sans', fontWeight: 500 }}
            >
              {criticoLoading ? 'Evaluando...' : 'Reevaluar'}
            </button>
          </div>

          {criticoLoading && !critico && (
            <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontSize: 13, fontFamily: 'DM Sans' }}>Analizando el sistema...</div>
          )}

          {critico && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Veredicto + score */}
              {critico.report && (
                <div style={{ background: C.surface, borderRadius: 12, padding: '20px 24px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ textAlign: 'center', minWidth: 72 }}>
                    <div style={{ fontSize: 40, fontWeight: 800, fontFamily: 'Cormorant Garamond', color: critico.report.score >= 7 ? C.sage : critico.report.score >= 4 ? C.gold : C.red, lineHeight: 1 }}>{critico.report.score}</div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans', marginTop: 2 }}>/10</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: C.text, fontWeight: 600, fontFamily: 'DM Sans', lineHeight: 1.5, marginBottom: 10 }}>{critico.report.verdict}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {critico.report.alertas?.map((a, i) => (
                        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: a.nivel === 'rojo' ? C.redFaint : a.nivel === 'amarillo' ? C.goldFaint : C.sageFaint, borderRadius: 6, padding: '3px 10px' }}>
                          <span style={{ fontSize: 7, color: a.nivel === 'rojo' ? C.red : a.nivel === 'amarillo' ? C.gold : C.sage }}>●</span>
                          <span style={{ fontSize: 11, color: C.textSoft, fontFamily: 'DM Sans' }}>{a.mensaje}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Métricas globales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {[
                  { label: 'Campañas', value: critico.resumen.totalCreativos },
                  { label: 'Leads totales', value: critico.resumen.totalLeads },
                  { label: 'Citados', value: critico.resumen.totalCitados },
                  { label: 'Cerrados', value: critico.resumen.totalCerrados },
                  { label: 'Orgánicos', value: critico.resumen.leadsOrganicos },
                ].map((s, i) => <StatCard key={i} label={s.label} value={String(s.value)} />)}
              </div>

              {/* Tabla de campañas */}
              <Card>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16, fontFamily: 'DM Sans', fontWeight: 600 }}>Rendimiento por campaña</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {critico.campañas.length === 0 && (
                    <div style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans', padding: '20px 0' }}>Sin campañas en los últimos 30 días.</div>
                  )}
                  {critico.campañas.map((c) => {
                    const gradeBg = { A: C.sageFaint, B: C.blueFaint, C: C.goldFaint, D: C.redFaint, F: C.redFaint }
                    const gradeColor = { A: C.sage, B: C.blue, C: C.gold, D: C.red, F: C.red }
                    const highlight = critico.report?.campañasDestacadas?.find(d => d.id === c.id)
                    const grade = highlight?.calificacion ?? (c.calidad === 'alta' ? 'B' : c.calidad === 'baja' ? 'D' : c.calidad === 'sin-datos' ? '—' : 'C')
                    return (
                      <div key={c.id} style={{ background: C.bg, borderRadius: 10, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto auto auto', alignItems: 'center', gap: 16 }}>
                        {/* Grade */}
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: grade !== '—' ? gradeBg[grade as keyof typeof gradeBg] : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, fontFamily: 'Cormorant Garamond', color: grade !== '—' ? gradeColor[grade as keyof typeof gradeColor] : C.muted }}>
                          {grade}
                        </div>
                        {/* Título + hook */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'DM Sans', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titulo}</div>
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.hook}</div>
                          {highlight?.veredicto && <div style={{ fontSize: 11, color: C.textSoft, fontFamily: 'DM Sans', marginTop: 4, lineHeight: 1.4 }}>{highlight.veredicto}</div>}
                        </div>
                        {/* Stats */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'Cormorant Garamond' }}>{c.leadsAtribuidos}</div>
                          <div style={{ fontSize: 9, color: C.muted, fontFamily: 'DM Sans' }}>leads</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, fontFamily: 'Cormorant Garamond' }}>{c.leadsCitados}</div>
                          <div style={{ fontSize: 9, color: C.muted, fontFamily: 'DM Sans' }}>citas</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.sage, fontFamily: 'Cormorant Garamond' }}>{c.leadsCerrados}</div>
                          <div style={{ fontSize: 9, color: C.muted, fontFamily: 'DM Sans' }}>cerrados</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: c.tasaFrio > 50 ? C.red : C.muted, fontFamily: 'Cormorant Garamond' }}>{c.tasaFrio}%</div>
                          <div style={{ fontSize: 9, color: C.muted, fontFamily: 'DM Sans' }}>fríos</div>
                        </div>
                        {/* Tipo badge */}
                        <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: C.blueFaint, color: C.blue, fontFamily: 'DM Sans', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.tipo}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Patrones + acciones */}
              {critico.report && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Card>
                    <div style={{ fontSize: 10, color: C.blue, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'DM Sans', fontWeight: 600 }}>Patrones detectados</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {critico.report.patronesDetectados?.map((p, i) => (
                        <div key={i} style={{ fontSize: 12, color: C.text, fontFamily: 'DM Sans', lineHeight: 1.5, display: 'flex', gap: 8 }}>
                          <span style={{ color: C.blue }}>→</span>{p}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: C.red, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'DM Sans', fontWeight: 600 }}>Problemas</div>
                    {critico.report.problemas?.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: p.impacto === 'alto' ? C.redFaint : p.impacto === 'medio' ? C.goldFaint : C.sageFaint, color: p.impacto === 'alto' ? C.red : p.impacto === 'medio' ? C.gold : C.sage, fontFamily: 'DM Sans', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.impacto}</span>
                        <div style={{ fontSize: 12, color: C.text, fontFamily: 'DM Sans', lineHeight: 1.4 }}>{p.problema}<span style={{ color: C.muted, fontStyle: 'italic' }}> — {p.evidencia}</span></div>
                      </div>
                    ))}
                  </Card>
                  <Card>
                    <div style={{ fontSize: 10, color: C.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'DM Sans', fontWeight: 600 }}>Acciones esta semana</div>
                    {critico.report.accionesInmediatas?.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: 'Cormorant Garamond', minWidth: 18 }}>{i + 1}.</span>
                        <div style={{ fontSize: 12, color: C.text, fontFamily: 'DM Sans', lineHeight: 1.5 }}>{a}</div>
                      </div>
                    ))}
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
