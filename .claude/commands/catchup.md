---
description: Ponte al día con el estado del proyecto Bahía y el último handoff del equipo
---
Ponme al día en este proyecto Bahía. Haz lo siguiente y dame un resumen al final:

1. Corre `git checkout main && git pull --rebase` (si hay conflictos, AVÍSAME; no los resuelvas sin preguntar).
2. Lee `docs/STATUS.md`.
3. Lee los 2-3 archivos más recientes de `docs/handoffs/` (los `2026-*.md`, por fecha).
4. Corre `git log --oneline -15`.

Luego dame un resumen de 6-8 líneas: **dónde quedó el proyecto, qué hizo cada quien la última vez,
qué está en progreso y mi siguiente paso concreto.**

Termina preguntándome en qué quiero trabajar hoy. Cuando lo decida, crea mi rama desde `dev`:
`git checkout dev && git pull --rebase && git checkout -b feat/<algo>`.
