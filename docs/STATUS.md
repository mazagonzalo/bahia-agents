# STATUS — Bahía (estado vivo)

> Para ponerte al día: lee esto + los 2 handoffs más recientes en `docs/handoffs/`.
> **Actualizado: 2026-06-19 (Xavier · sesión 3)**

## 🚀 Re-plataformado en curso (commerce-os → bahia-agents)
Plan de 6 fases para cablear bahia con la fundación de commerce-os (harness gobernado + Prisma + CRM)
+ **UI propia por agente**. Cada fase = PR a `dev` verde:
- **FASE 0 · Dashboard unificado por agente → ✅ DONE** (PR `feat/dashboard-ui`→`dev`). Shell oscuro multi-ruta, 9 agentes con su página, tendencias movido a `/dashboard/tendencias`. tsc/lint/build verdes.
- **FASE 1 · Prisma** (sobre el MISMO Postgres de Supabase) → ⛔ bloqueada: falta `DATABASE_URL`/`DIRECT_URL`.
- FASE 2 harness (orchestrator/evals/prompts) · 3 rewire agentes a Prisma (1 PR/agente) · 4 CRM Lead/Conversation gobernado · 5 hardening (auth por rol, pgvector) → pendientes.
**Decisión de datos:** Prisma activa el gobierno (migraciones, `AgentRunLog` de costo, enums, RLS deny-by-default) sin tirar pgvector ni lo de Gonzalo; se migra 1 agente por PR.

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
- **Trabajando en:** FASE 0 (dashboard unificado por agente) → ✅ hecha, **PR `feat/dashboard-ui`→`dev`** (CI verde local). Ver `docs/handoffs/2026-06-19-xavier.md`.
- **Siguiente:** mergear el PR del dashboard → **FASE 1 (Prisma)**, bloqueada por `DATABASE_URL`/`DIRECT_URL` de Supabase. Fases 1-2 quedan code-complete en cuanto haya tokens.

### Gonzalo
- **Trabajando en:** consolidación del repo — merge del PR de Xavier ✅, rama `dev` creada ✅, sitio HTML fusionado en `public/` ✅.
- **Siguiente:** agregar `CRON_SECRET` en Vercel env vars; dar acceso Write a Xavier en GitHub; revisar docs de estrategia de Xavier.

## Pendientes / bloqueos
- ⛔ **Supabase `DATABASE_URL`/`DIRECT_URL`** — bloquea la FASE 2 (Prisma). ¿Existe el proyecto con el schema aplicado? Pasarlo o `vercel env pull`.
- ⚠️ **Reconciliar `ci.yml`** al mergear PR #3 (Gonzalo agregó el secret de publishable key al job E2E; PR #3 también toca ese job + trae el fix de `proxy.ts`).
- ✅ **Acceso:** Xavier ya tiene Write en `bahia-agents`.
- 2 warnings de lint menores (vars sin usar) en `meta-ads` y `secretaria` — limpieza opcional.
- Follow-up técnico: las rutas se llaman entre sí por `fetch(NEXT_PUBLIC_URL/…)`; evaluar llamadas directas a funciones (ver handoff).
- Del dueño: auditoría Trainingym, accesos Meta/WhatsApp reales, reglas del Day Pass.
- Repos sueltos a archivar/consolidar: `bahia-final`, `bahiaclub-sitio`, `mock-bah-a`, `bahiaclub-backend-spec`.
