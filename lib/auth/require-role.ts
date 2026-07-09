// Harness / panel — autorización por ROL (fail-closed).
//
// El panel interno y su API de gobierno (/api/harness/*) exponen datos sensibles
// (ledger de costos, PII de leads) y acciones de gobierno (aprobar propuestas de
// agentes). El login de Clerk NO basta: hay que exigir un rol de panel.
//
// Lectura del rol (en orden):
//   1) sessionClaims.metadata.role del token de sesión — RÁPIDO, sin red. Requiere
//      customizar el session token de Clerk: Dashboard → Sessions → Customize session
//      token → { "metadata": "{{user.public_metadata}}" }. ⭐ RECOMENDADO: con esto el
//      camino de red de abajo NUNCA se usa.
//   2) Clerk Backend API (publicMetadata.role) — fallback confiable si el claim no
//      está. Tiene timeout (fail-fast) y cache corto por instancia para no acoplar la
//      latencia/disponibilidad de TODO el panel a Clerk en cada request.
//
// Activación (prod): el usuario debe tener publicMetadata.role ∈ {OWNER, ADMIN} en
// Clerk. Sin rol, fail-closed niega (ni siquiera tú entras) — asigna el tuyo antes
// de prod. Dev: DASHBOARD_ALLOW_NO_ROLE=true (solo cuando NODE_ENV !== 'production').

import { auth, clerkClient } from '@clerk/nextjs/server'

export const PANEL_ROLES = ['OWNER', 'ADMIN'] as const
export type PanelRole = (typeof PANEL_ROLES)[number]

function isPanelRole(role: string | null | undefined): role is PanelRole {
  return role === 'OWNER' || role === 'ADMIN'
}

/** Escape hatch SOLO de desarrollo. Nunca aplica en producción. */
function devBypass(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DASHBOARD_ALLOW_NO_ROLE === 'true'
}

// Cache de rol por usuario (TTL corto, por instancia serverless). Evita pegarle al
// Backend API de Clerk en CADA render/request. Solo se cachean lecturas exitosas:
// ante timeout/error NO se cachea, para reintentar al siguiente request.
const ROLE_TTL_MS = 60_000
const roleCache = new Map<string, { role: string | null; exp: number }>()

const CLERK_TIMEOUT_MS = 3000
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('clerk getUser timeout')), ms)
  })
  return Promise.race([p.finally(() => clearTimeout(timer)), timeout])
}

/**
 * Lee el rol del usuario de forma confiable y barata:
 *   1) del session token (sin red) si el JWT de Clerk expone publicMetadata;
 *   2) del cache por instancia (TTL corto);
 *   3) del Clerk Backend API con timeout (fail-fast, fail-closed ante fallo).
 */
async function readRole(userId: string, sessionClaims: unknown): Promise<string | null> {
  const claimRole = (sessionClaims as { metadata?: { role?: string } } | null)?.metadata?.role
  if (claimRole) return claimRole

  const cached = roleCache.get(userId)
  if (cached && cached.exp > Date.now()) return cached.role

  try {
    const client = await clerkClient()
    const user = await withTimeout(client.users.getUser(userId), CLERK_TIMEOUT_MS)
    const role = (user.publicMetadata as { role?: string } | undefined)?.role ?? null
    roleCache.set(userId, { role, exp: Date.now() + ROLE_TTL_MS })
    return role
  } catch {
    // Backend API lento/caído: fail-closed (tratamos como sin rol) y NO cacheamos,
    // para reintentar en el próximo request en vez de bloquear por TTL.
    return null
  }
}

export type RoleCheck =
  | { ok: true; userId: string; role: PanelRole | 'dev' }
  | { ok: false; status: 401 | 403; error: string }

/**
 * Exige sesión + rol de panel (OWNER/ADMIN). Fail-closed.
 * Usar al inicio de cada handler de /api/harness/* y para gatear el panel.
 */
export async function requirePanelRole(): Promise<RoleCheck> {
  if (devBypass()) return { ok: true, userId: 'dev', role: 'dev' }

  const { userId, sessionClaims } = await auth()
  if (!userId) return { ok: false, status: 401, error: 'no autorizado' }

  const role = await readRole(userId, sessionClaims)
  if (!isPanelRole(role)) {
    return { ok: false, status: 403, error: 'prohibido: se requiere rol OWNER o ADMIN' }
  }
  return { ok: true, userId, role }
}
