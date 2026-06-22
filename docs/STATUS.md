# STATUS — Bahía (estado vivo)

> ## 🔴🔴 GONZALO — ACCIÓN URGENTE EN CUANTO LEAS ESTO (1 min) 🔴🔴
> **El dashboard en Vercel se ve roto** (critico "sin evaluación", harness "sin datos", leads/seguimiento no cargan).
> **Causa:** los 9 agentes ya corren sobre **Prisma**, que necesita `DATABASE_URL`/`DIRECT_URL` en Vercel.
> Tú tienes acceso a Supabase + Vercel (`bahia-agents-37jp`, team `mazaprojects`). **Pon estas 2 vars (los 3 entornos) y haz Redeploy:**
> ```
> DATABASE_URL = postgresql://postgres.wrlngeqgvhxsozfvrdgh:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
> DIRECT_URL   = postgresql://postgres.wrlngeqgvhxsozfvrdgh:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres
> ```
> ⚠️ Usa el **POOLER** (`...pooler.supabase.com`, IPv4), NO la directa `db.xxx.supabase.co` (IPv6, Vercel no la alcanza).
> `<PASSWORD>` = la de Supabase (la tiene Xavier en su `.env.local`). El código está verificado E2E en localhost — solo falta esta var.
> **En cuanto la pongas + redeploy, TODO el dashboard funciona.** (Borra este bloque cuando esté hecho.)

> Para ponerte al día: lee esto + los 2 handoffs más recientes en `docs/handoffs/`.
> **Actualizado: 2026-06-22 (Gonzalo)**

## 🚀 Re-plataformado en curso (commerce-os → bahia-agents)
Plan de 6 fases para cablear bahia con la fundación de commerce-os (harness gobernado + Prisma + CRM)
+ **UI propia por agente**. Cada fase = PR a `dev` verde:
- **FASE 0 · Dashboard unificado por agente → ✅ DONE + MERGED a `dev`** (PR #12). Shell oscuro multi-ruta, 9 agentes con su página, tendencias en `/dashboard/tendencias`. **Velo en el preview de `dev`** (la URL sin sufijo = `main` = viejo; falta release dev→main).
- **FASE 1 · Prisma → ✅ DONE + APLICADA A PROD + VERIFICADA** (PR #13). `db pull` de la DB viva, migraciones `0_init`+`1_governance_harness` (6 tablas Agent* + enums + RLS) con `migrate deploy` — **aditivo, tablas de Gonzalo intactas** (`trends=52`). ⚠️ DIRECT directo es IPv6-only → usar pooler session-mode 5432.
- **FASE 2 · Harness → ✅ DONE + VERIFICADO E2E** (PR #13). `runAgent`/evals portados; `eval:agents` **18/18 fixtures, juez 4.5–5.0/5**. + **Fase 3-lite: UI de Gobierno** `/dashboard/harness` (ledger + aprobaciones). 9 prompts v1 sembrados en `AgentPromptVersion`.
- FASE 3 rewire de los 9 agentes VIVOS a `runAgent`+Prisma (1 PR/agente, con cuidado) · 4 CRM Lead/Conversation · 5 hardening (RLS legacy + auth por rol) → pendientes.
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
- **Trabajando en:** **Agente de contenido rediseñado y EN PRODUCCIÓN** (PR #29→`dev`, #30→`main`): (1) sugerencias de contenido = apoyo de ideas con guías detalladas + score; (2) carrusel promocional con **ciclo de pauta de 14 días** (3 variantes ángulos distintos → aprobar → derivar 2 de rotación) + cron `promo-cycle` (días 1 y 15). Slides flexibles 2-8, foto específica por slide, pide solo las que faltan, sin IA/muapi. Comparte datos con tendencias vía `agent_memory`. Ver `docs/handoffs/2026-06-22-gonzalo.md`.
- **Siguiente:** cerrar el ciclo — aprobado→**meta-ads** (lanzar pauta) + **crítico**→contenido (rotación al bajar la curva); subir **fotos reales** a `club_assets`; **Canva** para ensamblar el carrusel final.

## Pendientes / bloqueos
- ⛔ **Supabase `DATABASE_URL`/`DIRECT_URL`** — bloquea la FASE 2 (Prisma). ¿Existe el proyecto con el schema aplicado? Pasarlo o `vercel env pull`.
- ⚠️ **Reconciliar `ci.yml`** al mergear PR #3 (Gonzalo agregó el secret de publishable key al job E2E; PR #3 también toca ese job + trae el fix de `proxy.ts`).
- ✅ **Acceso:** Xavier ya tiene Write en `bahia-agents`.
- 2 warnings de lint menores (vars sin usar) en `meta-ads` y `secretaria` — limpieza opcional.
- Follow-up técnico: las rutas se llaman entre sí por `fetch(NEXT_PUBLIC_URL/…)`; evaluar llamadas directas a funciones (ver handoff).
- Del dueño: auditoría Trainingym, accesos Meta/WhatsApp reales, reglas del Day Pass.
- Repos sueltos a archivar/consolidar: `bahia-final`, `bahiaclub-sitio`, `mock-bah-a`, `bahiaclub-backend-spec`.
