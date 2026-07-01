# Montar un cliente nuevo (checklist)

Cómo clonar este sistema para una empresa nueva. **No se arma nada a mano:** el código y la
estructura de la base de datos ya están guardados; solo se crea una base vacía nueva y se ponen
las llaves. ~30–60 min por cliente.

> **Regla de oro:** cada cliente tiene su **propia base de datos** (vacía) y sus **propias cuentas**
> (Meta/WhatsApp/Google). Nunca se comparten datos entre clientes.

---

## 0. Antes de empezar — cuentas necesarias
- Cuenta de **GitHub** (para clonar el repo).
- Cuenta de **Vercel** (deploy).
- Cuenta de **Supabase** (base de datos del cliente).
- Cuenta de **Clerk** (login del dashboard).
- Tus llaves de IA (Claude, Perplexity) — se reutilizan.
- Accesos del **cliente**: Meta (IG/FB), WhatsApp Business, Google Business (según lo que active).

---

## 1. Clonar el código
```bash
# Opción A: "Use this template" en GitHub (recomendado) → crea el repo del cliente.
# Opción B:
git clone <repo-plantilla> cliente-nuevo && cd cliente-nuevo
rm -rf .git && git init   # empieza su propio historial
npm install
```

## 2. Crear la base de datos (Supabase)
1. Entra a **supabase.com → New project** (elige región cercana, ej. `us-east`).
2. En **Project Settings → Database → Connection string** copia:
   - **Pooled** (`...pooler.supabase.com:6543?pgbouncer=true`) → será `DATABASE_URL`.
   - **Direct** (`...:5432`) → será `DIRECT_URL`.

## 3. Crear TODAS las tablas con un comando
Con `DATABASE_URL` y `DIRECT_URL` ya en tu `.env.local`:
```bash
npx prisma@6 db push      # crea leads, conversations, agent_memory, club_events, etc.
npx prisma@6 generate
```
> Esto lee `prisma/schema.prisma` (guardado en el código) y crea la estructura completa. La base
> queda **vacía** — sin datos de otros clientes. ✅

## 4. Variables de entorno
Divide en **tuyas** (reutilizables) y **del cliente** (nuevas cada vez):

### Reutilizables (las mismas en todos los clientes — tú pagas, lo cobras en el retainer)
| Variable | Qué es |
|---|---|
| `ANTHROPIC_API_KEY` | Claude (razonamiento de los agentes) |
| `PERPLEXITY_API_KEY` | Investigación de tendencias |
| `LINKFOXAGENT_API_KEY` | Google Trends |
| `CRON_SECRET` | Genera uno nuevo por deploy: `openssl rand -hex 32` |

### Por cliente (nuevas cada vez)
| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | La Supabase nueva (paso 2) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Supabase → Settings → API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | App nueva en Clerk (login del cliente) |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` / `WHATSAPP_VERIFY_TOKEN` | WhatsApp Business del cliente |
| `META_APP_ID` / `META_APP_SECRET` / `META_AD_ACCOUNT_ID` | Meta del cliente |
| `ADMIN_PHONE` | Teléfono del admin del cliente |
| `NEXT_PUBLIC_URL` | El dominio del deploy del cliente |

> Las de canales (WhatsApp/Meta/Google) se pueden dejar vacías al inicio: el sistema funciona sin
> ellas (esos agentes quedan "listos, requieren conexión") y se llenan cuando el cliente conecte.

## 5. Personalizar al cliente  ⏳ *(pendiente del refactor "neutro")*
Hoy los datos de la empresa (nombre, industria, instalaciones, precios, voz de marca, paleta, logo,
fotos) están **repartidos en el código** (~104 líneas). Por ahora: buscar/reemplazar los de Bahía.

**Después del refactor neutro** será: editar **un solo archivo** `lib/client.config.ts` + cambiar los
assets en `public/brand/`. → *(este paso se actualizará cuando hagamos ese refactor.)*

## 6. Desplegar
```bash
vercel link          # conecta el repo a un proyecto Vercel nuevo
# En Vercel → Settings → Environment Variables: pega TODAS las del paso 4 (Production + Preview)
vercel deploy --prod
```

## 7. Verificar
- [ ] CI verde (build + typecheck + E2E).
- [ ] Dashboard abre (login Clerk) y las pestañas cargan.
- [ ] Genera un contenido de prueba → funciona.
- [ ] Los crons quedan activos (`vercel.json`): tendencias diario, seguimiento c/4h, promo c/14d.

---

## Resumen mental
| Cosa | ¿Viaja con el código? |
|---|---|
| Lógica de los agentes + integraciones | ✅ Sí |
| Estructura de la base (schema) | ✅ Sí (se recrea con `prisma db push`) |
| Datos (leads, memoria…) | ❌ No — base nueva vacía por cliente |
| Llaves de IA (Claude, Perplexity) | ♻️ Reutilizables (tuyas) |
| Cuentas del cliente (Meta/WhatsApp/Google) | ❌ Nuevas por cliente |
| Config de marca (nombre, precios, paleta) | ⏳ Un solo archivo, tras el refactor neutro |
