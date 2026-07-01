export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Solo lectura — devuelve el ÚLTIMO reporte del crítico ya calculado (rápido, sin
// recalcular). El dashboard lo lee al abrir; "Reevaluar" llama a GET /api/agents/critico.
export async function GET() {
  const data = await prisma.agent_memory.findFirst({
    where: { agent: 'critico', type: 'reporte' },
    orderBy: { created_at: 'desc' },
    select: { content: true, created_at: true },
  })

  if (!data) {
    return NextResponse.json({ error: 'Sin reporte del crítico aún', hint: 'Genera uno con GET /api/agents/critico' }, { status: 404 })
  }
  try {
    return NextResponse.json({ ...JSON.parse(data.content), storedAt: data.created_at })
  } catch {
    return NextResponse.json({ error: 'Reporte corrupto en base de datos' }, { status: 500 })
  }
}
