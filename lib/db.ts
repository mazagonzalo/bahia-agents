// Cliente Prisma singleton sobre el MISMO Postgres de Supabase.
//
// Init PEREZOSO (igual que lib/supabase.ts): el cliente se crea en el primer
// acceso, no al importar — así `next build` y los imports en módulos que no
// consultan la DB no truenan si falta DATABASE_URL. Pool compartido (max 10)
// para no agotar el límite de conexiones de Supabase en hot-reload / serverless.
//
// Patrón portado de commerce-os-template/src/lib/db.ts.

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prismaPool: Pool | undefined
  prisma: PrismaClient | undefined
}

/** Supabase pooler exige SSL; local/CI postgres no lo soporta. */
function shouldUseSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString)
    if (url.searchParams.get('sslmode') === 'disable') return false
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') return false
    return true
  } catch {
    return true
  }
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL no está definido')

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
  })
  pool.on('error', (err: Error) => {
    console.error('[db] error en el pool de pg (se descarta la conexión):', err.message)
  })
  return pool
}

function createPrismaClient(): PrismaClient {
  if (!globalForPrisma.prismaPool) globalForPrisma.prismaPool = createPool()
  const adapter = new PrismaPg(globalForPrisma.prismaPool)
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

// Proxy perezoso: no conecta hasta el primer uso real de `prisma`.
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient()
      const value = Reflect.get(globalForPrisma.prisma, prop)
      return typeof value === 'function' ? value.bind(globalForPrisma.prisma) : value
    },
  })
