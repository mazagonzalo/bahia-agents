# PLAN — Bahía Intelligence (companion analytics + agentes operativos sobre Trainingym)

> **Fecha:** 2026-06-20 · **Autor:** Xavier (+ Claude) · **Estado:** plan aprobado · **Enfoque: FUNDACIÓN-PRIMERO (sin datos todavía, pitch al gerente pendiente)** · **Repo:** `~/code/bahia-agents`, rama `dev`

---

## TL;DR (para el handoff)

Construir **"Bahía Intelligence"**: una capa **companion de analítica + agentes** encima de **Trainingym**, sobre la fundación que ya tenemos (Prisma gobernado + harness de agentes + dashboard).

- **⚠️ Situación actual:** **todavía NO hay datos de Trainingym ni acuerdo** — Xavier va a **pitchearle al gerente del club** primero. Por eso construimos **fundación-primero**: el esqueleto donde vivirá el sistema, **data-agnostic** (esquema diseñado desde la investigación, no desde exports reales) y **demostrable para el pitch**, con la **subida de históricos como un switch** que se activa cuando el club diga que sí.
- **Por qué funciona:** Trainingym captura muchísima data pero su analítica es su debilidad reconocida. Ya existe un competidor — **FitnessKPI** (Gold's Gym/Planet Fitness) — que vende justo esto encima de Trainingym → **categoría validada**. Nuestro diferenciador: **agentes gobernados + WhatsApp que CIERRAN EL LOOP con acción**.
- **Cómo entrarán los datos (después):** Trainingym **no tiene API pública**. Ruta principal = **export Excel del panel admin**. Side-doors = **Stripe propio** (Stripe Connect) y **Alegra**. → Ingesta **"trae tu export"** vía el **Agente Informe**; live-sync más adelante.
- **Objetivo #1 (cuando haya datos):** **Motor Day-Pass → socio**.
- **Arquitectura:** **multi-tenant desde el día 1** (`clubId` + RLS por club) → foco Bahía pero replicable.
- **Agentes nuevos:** **Informe** (sube Excel raw → reporte digerible + persiste), **Finanzas** (ingresos/MRR, cobranza/morosos, P&L+forecasting), **RH** (desempeño de entrenadores, horarios/asistencia).
- **Siguiente movimiento (planeado por Xavier):** **implementar la Fase 0 — Fundación** (esquema multi-tenant + esqueleto de ingesta + dashboard demostrable). No requiere datos reales.
- **Bloqueo de prod:** sigue pendiente la `DATABASE_URL` de Gonzalo en Vercel; la fundación se desarrolla y verifica en localhost sin eso.

---

## 1. Contexto estratégico

Bahía es un club premium (pádel + wellness) en México. La propuesta: construir `bahia-agents` como capa **companion** sobre Trainingym (no lo reemplaza). **El gerente aún no aprueba** — esta fundación + demo es, en parte, **la herramienta de venta del pitch**.

**Hallazgos de la investigación (workflow 7-frentes, 2026-06-20):**
- Trainingym = SaaS de gestión retention-first, fuerte en México (Sportium, Ultra Gym), 1,200+ gimnasios. Captura accesos, NPS, body-comp, reservas, pagos, planes.
- **Debilidad = analítica/portabilidad de datos.** Capterra: piden "análisis de datos más profundo"; "difícil extraer data de socios".
- **Validación de mercado:** **FitnessKPI** existe solo para ser la capa BI sobre Trainingym. No inventamos categoría — la mejoramos: **Spanish/MXN-native + agéntica + WhatsApp + Motor Day-Pass**.
- **Norte analítico:** la señal #1 es la **frecuencia de visita temprana** (50% de socios nuevos se va <6 meses; 2x/semana = -50% de churn; una frecuencia que cae avisa el abandono ~2 meses antes). Trainingym NO hace cohortes / funnel / scoring explicable / RFM → **nuestros huecos**.

## 2. Realidad de integración (cómo entrarán los datos, después)

| Ruta | Factibilidad | Qué trae |
|---|---|---|
| **Export Excel del panel admin** | Alta | Reportes manuales: accesos, socios, pagos, encuestas/NPS, actividades. La ruta principal. |
| **Cuenta Stripe propia** (por confirmar) | Alta *si Bahía es dueña* | Trainingym Payments = Stripe Connect → todo el dinero vía Stripe API, sin depender de Trainingym. |
| **Alegra** (por confirmar) | Media | Facturas/CFDI vía API de Alegra con cuenta+token propios. |
| **Webhooks de Trainingym** | Media | Solo 2 eventos (pago exitoso + alta/edición de actividad). NO empuja socios/asistencia/NPS. |
| **API pública / partner** | Baja/incierta | No documentada. Palanca: doc interno en Apiary + competidores con REST API → pedir acuerdo partner. |

**Decisión:** la ingesta es **source-agnostic ("trae tu export")**. El **esquema se diseña AHORA desde la investigación** (conocemos las columnas de los reportes de Trainingym); cuando lleguen exports reales será solo un ajuste menor de mapeo de columnas.

## 3. Decisiones tomadas (log)

1. Objetivo #1 = **Day-pass → socio** (cuando haya datos).
2. Alcance = **Bahía primero, multi-tenant desde el día 1** (revendible).
3. **Agente Finanzas:** Ingresos/MRR + Cobranza/morosos + P&L/forecasting.
4. **Agente RH:** Desempeño de entrenadores + Horarios/asistencia de staff.
5. **Agente Informe (Excel):** **ambos** — reporte al momento + persiste histórico.
6. **Enfoques de reporte:** General ejecutivo · Retención/riesgo · Day-pass→socio · Finanzas/operación.
7. **🔄 PIVOTE (2026-06-20):** **sin datos todavía, pitch al gerente pendiente** → **fundación-primero**, data-agnostic, demostrable; **subida de históricos = switch posterior**.

## 4. Inventario de datos / modelos Prisma (diseñados desde la investigación, todos con `clubId` + RLS)

| Modelo | Campos clave | Análisis que habilita |
|---|---|---|
| `Club` | tenant, nombre, config | Multi-tenant / revender |
| `Member` (canónico) | id, nombre, email, tel, alta, demografía | Identidad unificada (une exports por email/tel) |
| `Membership` | tier, estado, alta/baja, renovación, ticket | Churn, cohortes, LTV, ARPM |
| `DayPass`/`Visit` | fecha, fuente, monto, → conversión | **Motor Day-Pass (objetivo #1)** |
| `AccessLog` | socio, fecha/hora, método, sede | Frecuencia de visita (señal #1), horas pico |
| `Booking` | cancha/clase, capacidad, asistencia, no-show | Utilización de canchas (clave en pádel) |
| `Payment` | socio, monto, estado, método, fecha | Ingresos/MRR, morosos, conciliación |
| `Survey`/`NPS` | socio, score, fecha, comentario | NPS→retención, detractores→recuperación |
| `Employee`/`Trainer` | rol, dedicación, socios asignados, turnos | **Agente RH** |
| `Expense` (captura ligera) | categoría, monto, fecha | **P&L del agente Finanzas** (Trainingym no lo tiene) |
| `IngestBatch` | archivo, tipo, filas, fecha, hash | Trazabilidad de cada subida (idempotencia + AuditLog) |

## 5. Roster de agentes

Los **9 existentes** siguen igual. Se suman **3 agentes operativos** en un grupo de nav **"Operación"**, cada uno con su página, gobernados por el mismo harness (`runAgent` + `AgentRunLog` + `AgentApproval` + evals):

### 🆕 Agente **Informe** (sube Excel raw → reporte digerible)
- **Input:** el Excel **raw** exportado de Trainingym (cualquier reporte).
- **Proceso:** detecta el tipo por columnas → normaliza → **dedupe por llave de identidad** → **persiste** (`IngestBatch` + tablas). `AuditLog`.
- **Salida:** **resumen ejecutivo digerible** del estado de los clientes y **te pregunta el enfoque**: General · Retención/riesgo · Day-pass→socio · Finanzas/operación.
- **Entrega:** interactivo en `/dashboard` + **exportable** (PDF/WhatsApp).
- **En la fundación:** se construye su esqueleto y se prueba con un **Excel sintético Trainingym-shaped** (lo generamos nosotros desde el esquema de la investigación) → cuando lleguen archivos reales, solo se ajusta el mapeo.

### 🆕 Agente **Finanzas**
- **Ingresos/MRR**, **Cobranza/morosos** (lista priorizada + recordatorios WhatsApp gobernados), **P&L/forecasting** (requiere `Expense`).

### 🆕 Agente **RH**
- **Desempeño de entrenadores** (utilización, ratio de dedicación, NPS por coach), **Horarios/asistencia** (cobertura vs horas pico cruzando accesos).

## 6. Plan por fases (FUNDACIÓN-PRIMERO)

### ▶️ Fase 0 · Fundación *(AHORA — sin datos, es el siguiente movimiento)*
La base donde vivirá el sistema. No requiere datos reales.
- **Esquema Prisma multi-tenant** (sección 4) con `clubId` + RLS deny-by-default, migración en git.
- **Contrato de ingesta + esqueleto del Agente Informe:** flujo upload → detecta tipo → normaliza → persiste, probado con **Excel sintético Trainingym-shaped**.
- **Dashboard:** `/dashboard/analytics` (shell) + páginas de los 3 agentes nuevos (Informe/Finanzas/RH) con **empty states** elegantes ("conecta tus datos de Trainingym").
- **CI verde + verificado en localhost.**

### Fase 1 · Demo pitch-ready *(la herramienta de venta)*
- **Seed de datos demo realistas** (socios, accesos, day-passes, pagos, NPS) → el dashboard **cuenta la historia** (KPIs, funnel Day-Pass, reportes) sin filtrar nada real.
- Aprovechar el patrón **modo demo/lead** (ya construido en Bronce) → Xavier le **muestra al gerente** lo que el sistema hará.

### Fase 2 · Activación con datos reales *(switch — cuando el club diga sí)*
- Subir **históricos** vía el Agente Informe → identity resolution → KPIs reales reemplazan al demo.
- Ajuste de mapeo de columnas contra los exports reales. Confirmar Stripe/Alegra.

### Fase 3 · Motor Day-Pass *(objetivo #1)*
- `/dashboard/analytics` con KPIs reales + funnel **day-pass → retorno → inscripción** + lista de **"day-passes calientes sin convertir"** + digest WhatsApp al dueño.

### Fase 4 · Agéntico + Finanzas + RH
- Cablear el funnel a **ventas/seguimiento** (outreach WhatsApp gobernado) + scoring de conversión explicable + atribución de ROI.
- Levantar **Finanzas** y **RH**.

### Fase 5 · Retención + live-sync + BI conversacional
- Churn explicable + win-back; **Stripe-directo** + **webhooks Trainingym**; el Agente Informe evoluciona a **"pregúntale a tus datos"**; **listo para vender** a otro club.

## 7. Lo que se necesita
- **Ahora (Fase 0–1):** nada externo — se construye con esquema de investigación + datos demo. *(El build solo necesita la luz verde de Xavier.)*
- **Después (Fase 2, si el gerente aprueba):** exports de Trainingym; confirmar dueño de Stripe/Alegra; reglas del day-pass (precio, qué cuenta como "conversión", ventana); categorías de gasto para el P&L.
- **Gonzalo — prod:** `DATABASE_URL`/`DIRECT_URL` (pooled) en Vercel + redeploy (ver `docs/handoffs/2026-06-19-xavier-3.md`). La fundación se desarrolla/verifica en localhost sin esto.

## 8. Riesgos
- **El gerente puede decir que no** → por eso la fundación + demo es barata y sirve como pitch; nada depende de datos reales hasta la Fase 2.
- **Sin API pública** → mitigado con ingesta export-first; live-sync es mejora, no requisito.
- **Calidad de data** del export manual → validación + dedupe idempotente + `IngestBatch`/`AuditLog`.
- **ToS de Trainingym** → solo rutas sancionadas (export + webhooks + Stripe propio); **nada de scraping**.
- **Propiedad de cuentas** (Trainingym/Stripe) → confirmar antes de prometer side-doors.
