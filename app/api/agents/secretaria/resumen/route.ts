export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Resumen proactivo del día para la Secretaria — cálculo determinista (sin Claude),
// carga instantánea. El dashboard lo muestra arriba del chat al abrir la pestaña.
export async function GET() {
  const now = Date.now()
  const h24 = new Date(now - 24 * 3600 * 1000)
  const d7 = new Date(now - 7 * 24 * 3600 * 1000)
  const h48 = new Date(now - 48 * 3600 * 1000)
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [nuevos24h, nuevos7d, calificados, citados, cerrados7d, borradores, sinSeguimiento, ultimaTendencia, criticoRep, gastoMes] = await Promise.all([
    prisma.leads.count({ where: { created_at: { gte: h24 } } }),
    prisma.leads.count({ where: { created_at: { gte: d7 } } }),
    prisma.leads.count({ where: { status: 'calificado' } }),
    prisma.leads.count({ where: { status: 'citado' } }),
    prisma.leads.count({ where: { status: 'cerrado', last_contact: { gte: d7 } } }),
    prisma.creatives.count({ where: { status: 'borrador' } }),
    prisma.leads.count({ where: { status: { in: ['nuevo', 'calificado'] }, last_contact: { lt: h48 } } }),
    prisma.trends.findFirst({ orderBy: { created_at: 'desc' }, select: { topic: true, score: true } }),
    prisma.agent_memory.findFirst({ where: { agent: 'critico', type: 'reporte' }, orderBy: { created_at: 'desc' }, select: { content: true } }),
    prisma.agentRunLog.aggregate({ where: { createdAt: { gte: inicioMes } }, _sum: { costUsd: true } }),
  ])

  const atencion: string[] = []
  if (borradores) atencion.push(`${borradores} creativo(s) en borrador por aprobar`)
  if (sinSeguimiento) atencion.push(`${sinSeguimiento} lead(s) sin seguimiento hace +48h`)
  if (citados) atencion.push(`${citados} lead(s) citado(s) — confirmar asistencia`)

  // Alertas del Crítico (si evaluó): las trae al resumen para que sean proactivas.
  try {
    const rep = criticoRep?.content ? (JSON.parse(criticoRep.content) as { report?: { alertas?: (string | { mensaje?: string })[] } }) : null
    for (const a of rep?.report?.alertas ?? []) {
      const msg = typeof a === 'string' ? a : a?.mensaje
      if (msg) atencion.push(`Crítico: ${msg}`)
    }
  } catch { /* sin alertas del crítico */ }

  return NextResponse.json({
    fecha: new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
    leads: { nuevos24h, nuevos7d, calificados, citados, cerrados7d },
    creativos: { borradores },
    atencion,
    ultimaTendencia: ultimaTendencia ? `${ultimaTendencia.topic} (${ultimaTendencia.score})` : null,
    gastoMesUsd: Number(gastoMes._sum.costUsd ?? 0),
  })
}
