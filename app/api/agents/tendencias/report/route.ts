export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Endpoint de solo lectura — devuelve el último briefing generado (vía Prisma)
// Usado por: /dashboard/tendencias, Ventas, Contenido, Meta Ads, Admin

export async function GET() {
  const data = await prisma.agent_memory.findFirst({
    where: { agent: 'tendencias', type: 'briefing' },
    orderBy: { created_at: 'desc' },
    select: { content: true, created_at: true },
  })

  if (!data) {
    return NextResponse.json({ error: 'No hay ningún reporte generado aún', hint: 'Llama a GET /api/agents/tendencias para generar uno' }, { status: 404 })
  }

  let report = null
  try {
    report = JSON.parse(data.content)
  } catch {
    return NextResponse.json({ error: 'Reporte corrupto en base de datos' }, { status: 500 })
  }

  return NextResponse.json({
    generatedAt: data.created_at,
    report,
  })
}
