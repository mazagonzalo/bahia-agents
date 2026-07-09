import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// El middleware de Clerk SOLO corre en el panel interno (/dashboard, /admin) y
// su API de gobierno (/api/harness/*). El sitio público, los webhooks y los crons
// NUNCA pasan por Clerk — así la web pública es independiente de la auth (no hay
// "handshake" en /) y no requiere keys de Clerk para servirse. Webhooks/crons
// tienen su propia auth.
//
// ⚠️ /api/harness/* DEBE estar en el matcher: sus handlers llaman `auth()`, y
// `auth()` solo funciona en rutas que pasan por clerkMiddleware. Sin esto, esas
// rutas tiraban 500 "Clerk: auth() was called but Clerk can't detect usage of
// clerkMiddleware()" en producción.
const isProtected = createRouteMatcher(['/dashboard(.*)', '/admin(.*)', '/api/harness(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/harness/:path*'],
}
