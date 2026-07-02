export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Calendario de marketing: qué va a salir/pasar en los próximos días. Junta lo que
// el sistema ya hace en automático (recordatorios de eventos, ciclo de carrusel
// promo cada 14 días, reporte semanal) con los eventos reales del club. Determinista.
type Kind = 'evento' | 'recordatorio' | 'contenido' | 'reporte'
type Item = { date: string; kind: Kind; title: string; detail?: string }

const DAYS_AHEAD = 45
const iso = (d: Date) => d.toISOString().split('T')[0]

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + DAYS_AHEAD)

  let eventos: { name: string; sport: string | null; recurrence: string | null; start_date: Date | null; time_of_day: string | null }[] = []
  try {
    eventos = await prisma.club_events.findMany({
      where: { active: true },
      select: { name: true, sport: true, recurrence: true, start_date: true, time_of_day: true },
      orderBy: { start_date: 'asc' },
    })
  } catch { /* sin DB → calendario solo con lo programado */ }

  const items: Item[] = []
  const recurrentes: { title: string; detail: string }[] = []

  for (const e of eventos) {
    if (e.recurrence && !e.start_date) {
      recurrentes.push({ title: e.name, detail: [`cada ${e.recurrence}`, e.time_of_day, e.sport].filter(Boolean).join(' · ') })
      continue
    }
    if (!e.start_date) continue
    const sd = e.start_date
    if (sd >= today && sd <= end) {
      items.push({ date: iso(sd), kind: 'evento', title: e.name, detail: [e.sport, e.time_of_day].filter(Boolean).join(' · ') || undefined })
    }
    const rem = new Date(sd)
    rem.setDate(rem.getDate() - 3)
    if (rem >= today && rem <= end) {
      items.push({ date: iso(rem), kind: 'recordatorio', title: `Recordatorio: ${e.name}`, detail: 'El sistema dispara contenido y te avisa' })
    }
  }

  // Ciclo de carrusel promo: días 1 y 15 de cada mes (≈ cada 14 días).
  for (const d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDate() === 1 || d.getDate() === 15) {
      items.push({ date: iso(d), kind: 'contenido', title: 'Ciclo de carrusel promocional', detail: 'El sistema genera 3 variantes para tu aprobación' })
    }
  }

  // Reporte semanal: cada lunes.
  for (const d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 1) {
      items.push({ date: iso(d), kind: 'reporte', title: 'Reporte semanal', detail: 'Resumen ejecutivo al admin' })
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date))
  return NextResponse.json({ items, recurrentes, from: iso(today), days: DAYS_AHEAD })
}
