# STATUS — Bahía (estado vivo)

> Para ponerte al día: lee esto + los 2 handoffs más recientes en `docs/handoffs/`.
> **Actualizado: 2026-06-15 (Xavier)**

## En una línea
`bahia-agents` es el **repo canónico**: aquí vive la **app** (5 agentes de marketing IA del compa) +
la **estrategia** (`docs/estrategia/`) + el **sistema de colaboración/handoffs**. Acabamos de hacer un
**saneamiento de higiene + CI/CD** y consolidar todo en este repo.

## La app (lo de tu compa — código)
- Next.js 16 + React 19 + Supabase (PG + pgvector) + Claude (sonnet-4-6) + WhatsApp Cloud API + Meta.
- 5 agentes en `app/api/agents/*`: secretaria, ventas, tendencias, contenido, meta-ads. Crons + webhook.
- Dashboard de tendencias en `app/dashboard`. Backlog técnico en `PENDIENTES.md`.

## La estrategia (lo de Xavier — `docs/estrategia/`, abrir en navegador)
1. `01-analisis-vs-commerce-os-template.html`  2. `02-pivote-estrategia-companion.html`
3. `03-propuesta-v3-investigacion-mercado.html`  4. `04-motor-daypass-objetivo-1.html`
Resumen: ser **capa companion** sobre Trainingym (no reemplazarlo). **Objetivo #1 = Motor Day Pass → Inscripción.**

## Saneamiento hecho (PR de Xavier, 2026-06-15)
- 🔴→✅ **Build arreglado** (Supabase se inicializaba en el import → ahora perezoso; `next build` ya pasa).
- 🔴→✅ **Seguridad:** firma del webhook WhatsApp (`META_APP_SECRET`) + auth de crons (`CRON_SECRET`, `lib/cron-auth.ts`).
- ✅ **CI/CD** nuevo (`.github/workflows/ci.yml`: typecheck + lint + build).
- ✅ `vercel.json` con los 3 crons; `.env.example`; lint del dashboard en 0 errores; README Next 16.
- ✅ Webhook usa `after()` para background confiable; `lib/claude.ts` lee texto de forma segura.

## En progreso
### Xavier
- **Trabajando en:** saneamiento + consolidación de repos (este PR).
- **Siguiente:** la **checklist de "Semana 0"** (descubrimiento de datos con el dueño) y conectar la estrategia (Day Pass) con la app de agentes del compa.

### Gonzalo (cuate — confirma/edita tu bloque)
- **Trabajando en:** la app de agentes (tendencias, ventas, etc.).
- **Siguiente:** revisar/mergear el PR de saneamiento; correr `/catchup`; leer el handoff de Xavier.

## Pendientes / bloqueos
- **Acceso:** Xavier necesita permiso **Write** en `bahia-agents` (hoy es READ → el PR va vía fork).
- 2 warnings de lint menores (vars sin usar) en `meta-ads` y `secretaria` — limpieza opcional.
- Follow-up técnico: las rutas se llaman entre sí por `fetch(NEXT_PUBLIC_URL/…)`; evaluar llamadas directas a funciones (ver handoff).
- Del dueño: auditoría Trainingym, accesos Meta/WhatsApp reales, reglas del Day Pass.
- Repos sueltos a archivar/consolidar: `bahia-final`, `bahiaclub-sitio`, `mock-bah-a`, `bahiaclub-backend-spec`.
