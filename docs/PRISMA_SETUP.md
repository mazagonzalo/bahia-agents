# Prisma — Activación (Fase 1 del re-plataformado)

**Decisión:** Prisma sobre el **MISMO Postgres de Supabase** (no una segunda DB). Activa el gobierno de
datos (migraciones versionadas, `AgentRunLog` de costo/tokens, enums, RLS deny-by-default) sin tirar
pgvector ni romper los agentes de Gonzalo. Las escrituras de los agentes migran a Prisma **1 agente por PR**
(Fase 3); hoy siguen en `supabase-js`.

## Estado de esta rama (`feat/prisma-harness`)
- ✅ Deps + scripts de Prisma en `package.json`; `postinstall: prisma generate`.
- ✅ `prisma/schema.prisma` con los modelos **de gobierno** (Agent*: Approval, ProposalHistory, Context,
  PromptVersion, RunLog + AuditLog) y los enums (AgentType = los 9 agentes + META).
- ✅ `lib/db.ts` — cliente Prisma perezoso (PrismaPg + Pool compartido, SSL auto para Supabase).
- ✅ Verificado: `prisma validate` + `prisma generate` + `tsc` + `next build` en verde **sin DB**
  (generate no conecta; nada consulta en build).
- ⛔ **Pendiente (requiere `DATABASE_URL`/`DIRECT_URL`):** introspección de tablas legacy, migración baseline,
  migración de seguridad RLS, seed de prompts. **No verificable E2E hasta tener tokens.**

## Por qué faltan las tablas legacy en el schema
El `supabase/schema.sql` está **desfasado del código** (este usa `club_events`, `club_assets`, `reviews` y
valores de enum que no están en el .sql). La fuente de verdad es la **DB viva**, así que las tablas legacy
NO se hardcodean: se capturan con `prisma db pull` cuando haya credenciales.

## Runbook (cuando tengas los tokens de Supabase)

1. **Credenciales** (Supabase → Project Settings → Database → Connection string):
   ```bash
   # en .env.local
   DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-…pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.<ref>:<pwd>@aws-…pooler.supabase.com:5432/postgres"
   ```
   (o `vercel link && vercel env pull .env.local` si ya están en Vercel).

2. **Introspectar la DB viva** (agrega las tablas legacy AL schema, junto a los modelos de gobierno):
   ```bash
   npm run db:pull          # prisma db pull
   ```
   Revisa el diff: deben aparecer leads/conversations/agent_memory/creatives/trends/club_events/
   club_assets/reviews. Marca a mano `embedding` como `Unsupported("vector(1536)")?` en agent_memory.
   Convierte las columnas de estado (status, type…) a enums en una migración posterior.

3. **Generar el cliente y verificar conexión:**
   ```bash
   npm run prisma:generate
   npx tsx -e "import {prisma} from './lib/db'; prisma.\$queryRaw\`select 1\`.then(()=>console.log('ok')).finally(()=>process.exit())"
   ```

4. **Migración baseline + seguridad** — ⚠️ **NUNCA `prisma migrate dev` contra prod** (intenta reset).
   Usa una **branch de Supabase** o shadow DB, marca el esquema existente como aplicado, y agrega:
   - Crear las tablas de gobierno (Agent*, AuditLog) que aún no existen en la DB.
   - Una migración de **RLS deny-by-default** (reemplaza el `USING(true)` actual + habilita RLS en `agent_memory`).
   ```bash
   npm run db:migrate       # prisma migrate deploy  (a prod, tras probar en branch)
   ```

5. **Fase 2/3 (necesita además créditos Anthropic):** portar el harness (orchestrator/evals) desde
   commerce-os-template, sembrar 1 prompt v1 por agente, y rewirear cada agente a `runAgent()` + escrituras
   `prisma.*` (1 PR/agente). El gate de completion de cada agente: `pnpm eval:agents` no-regresión.

## Reglas
- `prisma migrate dev` SOLO contra branch/shadow; a prod va `migrate deploy`.
- pgvector se queda en `supabase-js` (Prisma no expresa `<=>`); modelar la columna como `Unsupported`.
- Migraciones en git (se acabó la era del `schema.sql` a mano).
