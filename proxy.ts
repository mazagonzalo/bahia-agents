import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// El middleware de Clerk SOLO corre en el panel interno (/dashboard, /admin).
// El sitio público, los webhooks y los crons NUNCA pasan por Clerk — así la web
// pública es independiente de la auth (no hay "handshake" en /) y no requiere
// keys de Clerk para servirse. Webhooks/crons tienen su propia auth.
const isProtected = createRouteMatcher(['/dashboard(.*)', '/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
