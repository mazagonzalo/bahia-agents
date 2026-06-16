import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifica que la petición venga de Vercel Cron (o de un caller autorizado).
 *
 * Vercel Cron envía `Authorization: Bearer <CRON_SECRET>` cuando la variable
 * CRON_SECRET está configurada en el proyecto. Sin esta verificación, las rutas
 * `/api/cron/*` quedan abiertas al público → cualquiera puede dispararlas y quemar
 * llamadas a Claude / WhatsApp (costo y abuso).
 *
 * Uso al inicio de cada handler de cron:
 *   const unauthorized = requireCron(req)
 *   if (unauthorized) return unauthorized
 *
 * Falla cerrado: si CRON_SECRET no está definido, rechaza (503) en vez de permitir todo.
 */
export function requireCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado en el entorno' },
      { status: 503 },
    )
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}
