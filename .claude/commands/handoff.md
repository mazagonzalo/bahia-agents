---
description: Cierra tu sesión — escribe el handoff del día, actualiza STATUS, commitea y sube
argument-hint: [tu-nombre]
---
Cierra mi sesión de hoy con un handoff. Mi nombre es: "$1" (si viene vacío, pregúntamelo).

Pasos:
1. Resume lo que hicimos hoy a partir de `git diff`, `git log` de la sesión y nuestra conversación.
2. Obtén la fecha real con `date +%F` y escribe `docs/handoffs/<fecha>-<nombre>.md` siguiendo
   `docs/handoffs/_TEMPLATE.md` — con los 6 puntos: **Qué hice · Por qué · Estado actual (qué corre /
   qué falla) · Siguiente paso · Archivos tocados · Bloqueos/dudas para el otro.**
3. Actualiza **SOLO mi bloque** (`## <Nombre>`) en `docs/STATUS.md` con mi estado actual y siguiente
   paso, y la fecha de "Actualizado". No toques el bloque del otro.
4. **Muéstrame el handoff y el diff de `STATUS.md` para que lo apruebe ANTES de subir.**
5. Al aprobar: `git add -A && git commit -m "handoff(<nombre>): <resumen corto> [<fecha>]"` y `git push`
   a mi rama de trabajo.
6. Si la feature ya está lista para integrar, ofréceme abrir PR a `dev`:
   `gh pr create --base dev` usando el handoff como cuerpo.

Regla: **nunca push a `main` directo.** El trabajo va por rama → PR a `dev`.
