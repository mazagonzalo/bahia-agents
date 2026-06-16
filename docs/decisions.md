# Decisiones — Bahía

Decisiones importantes + el porqué. La más reciente arriba.

- **2026-06-15 · `bahia-agents` es el repo canónico.** Tiene la app real (36 commits, historial). Traemos
  aquí la estrategia + el sistema de handoffs y conservamos todo el código del compa. Los demás repos
  (`bahia-final`, `bahiaclub-sitio`, `mock-bah-a`, `bahiaclub-backend-spec`) se archivan/consolidan.

- **2026-06-15 · Saneamiento + CI/CD.** Init perezoso de Supabase (build estaba roto), verificación de
  firma del webhook, auth de crons, y GitHub Actions (typecheck+lint+build). Subido vía fork+PR porque
  el acceso aún es READ.

- **2026-06-15 · Objetivo #1 = Motor Day Pass → Inscripción.** Único flujo con ingreso nuevo día 1,
  100% atribuible, y caso de uso ideal para el BI. Medir por incrementalidad vs grupo de control.

- **2026-06-15 · Pivote a capa "companion", NO reemplazar Trainingym.** Foso = relación + datos + ser el
  sistema de acción/inteligencia. Entramos por marketing/ingreso (0% solapado con Trainingym).

- **2026-06-15 · Geografía: Bahía de Banderas, Nayarit** (metro Vallarta–Riviera Nayarit).

- **2026-06-13 · Colaboración vía repo + handoffs diarios.** Contexto por git (STATUS + handoffs), no por
  la conversación. PRs a `dev`, nunca push a `main` directo.
