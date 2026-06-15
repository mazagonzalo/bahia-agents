export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Endpoint de solo lectura — devuelve el último briefing generado
// Usado por: Agente de Ventas, Agente de Contenido, Agente de Meta Ads, Admin

export async function GET() {
  const { data, error } = await supabase
    .from('agent_memory')
    .select('content, created_at')
    .eq('agent', 'tendencias')
    .eq('type', 'briefing')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
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
