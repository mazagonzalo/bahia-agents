@AGENTS.md

# Bahía Agents — Instrucciones del proyecto (Claude Code)

**Bahía Agents** es la aplicación (Next.js 16 + Supabase + Claude + WhatsApp) del proyecto para
**Bahía Social Sports Club** (club deportivo-social premium en Bahía de Banderas, Nayarit). Es el repo
**canónico**: aquí vive el código de los agentes Y la estrategia (`docs/estrategia/`). Trabajamos
**dos personas en paralelo**, cada quien en su máquina y su sesión de Claude.

> **El repo es el cerebro compartido.** La conversación de Claude NO se comparte entre máquinas; lo
> que sincroniza el contexto entre nosotros es **git** (archivos versionados que ambos Claudes leen).

## 🧠 Memoria compartida — los archivos que importan
| Archivo | Qué es |
|---|---|
| `docs/STATUS.md` | **Estado vivo.** "Dónde vamos hoy". Se sobreescribe. **Léelo primero.** |
| `docs/handoffs/AAAA-MM-DD-<nombre>.md` | **Bitácora por sesión** (1 por persona por día). Memoria/historial. |
| `docs/decisions.md` | Decisiones + el porqué. |
| `PENDIENTES.md` | Backlog técnico de la app (de tu compa). |
| `docs/estrategia/` | Entregables de estrategia e investigación de mercado. |

## ▶️ Al INICIAR sesión
1. Lee `docs/STATUS.md`. 2. Lee los 2-3 handoffs más recientes. 3. Resume al usuario dónde quedó.
Atajo: **`/catchup`**. Un hook de SessionStart (`.claude/settings.json`) ya inyecta el STATUS al abrir.

## ⏹️ Al TERMINAR sesión — **`/handoff`**
Escribe `docs/handoffs/<fecha>-<nombre>.md`, actualiza **solo tu bloque** en `docs/STATUS.md`, muestra
para aprobación, y `git commit` + `git push`. El handoff responde 6 cosas: **Qué hice · Por qué ·
Estado actual (qué corre / qué falla) · Siguiente paso · Archivos tocados · Bloqueos/dudas para el otro.**

## 🌿 Git (dos personas)
- **Nadie commitea a `main` directo.** `main` = estable, `dev` = integración.
- Rama desde `dev`: `git checkout dev && git pull --rebase && git checkout -b feat/<algo>`. PR a `dev`.
- `git pull --rebase` antes de empezar y antes de tocar archivos compartidos. Commits chicos.
- **Anti-conflicto:** handoffs = 1 archivo por persona/día (nunca chocan); `STATUS.md` tiene un bloque
  por persona (edita solo el tuyo). Si dos tocan el mismo archivo, coordínenlo en `STATUS.md`.

## ⚙️ La app (resumen)
- 5 agentes de marketing en `app/api/agents/*` (secretaria, ventas, tendencias, contenido, meta-ads).
- Crons en `app/api/cron/*` (protegidos con `CRON_SECRET`; ver `lib/cron-auth.ts`).
- Webhook WhatsApp en `app/api/webhooks/whatsapp` (verifica firma con `META_APP_SECRET`).
- `lib/` = clientes (Claude, Supabase con init perezoso, WhatsApp). `supabase/schema.sql` = esquema.
- Variables en `.env.example`. CI en `.github/workflows/ci.yml` (typecheck + lint + build).

## Reglas generales
- Lee un archivo antes de editarlo. NO crees docs nuevos salvo que se pidan. NUNCA subas secretos/.env.
- `git commit`/`push` solo cuando el usuario lo pida; nunca a `main` directo.
- Next.js 16 tiene breaking changes — respeta lo indicado en `AGENTS.md`.
