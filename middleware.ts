import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Rutas privadas (panel interno). El sitio público, los webhooks y los crons
// quedan FUERA: el sitio es público, y webhooks/crons tienen su propia auth
// (firma de Meta / CRON_SECRET).
const isProtected = createRouteMatcher(['/dashboard(.*)', '/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Corre en rutas de app + API, saltando estáticos de Next y archivos
    // del sitio público (.html/.css/.js/imágenes/fuentes).
    '/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|png|gif|svg|ico|webp|avif|woff2?|ttf|map)).*)',
    '/(api|trpc)(.*)',
  ],
}
