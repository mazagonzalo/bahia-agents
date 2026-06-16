# Bahía Agents — Sistema de Marketing IA

5 agentes de marketing automatizados para Bahía Social Sports Club. El admin solo aprueba por WhatsApp.

## Agentes

| Agente | Ruta | Trigger |
|---|---|---|
| Secretaria | `/api/agents/secretaria` | Mensajes del admin |
| Ventas | `/api/agents/ventas` | Mensajes de leads |
| Tendencias | `/api/agents/tendencias` | Cron 8am diario |
| Contenido | `/api/agents/contenido` | Post-tendencias |
| Meta Ads | `/api/agents/meta-ads` | Aprobación + cron |

## Setup

### 1. Variables de entorno
```bash
cp .env.example .env.local
# Llenar todos los valores en .env.local
```

### 2. Base de datos Supabase
```
Supabase Dashboard → SQL Editor → pegar supabase/schema.sql → Run
```

### 3. WhatsApp Webhook
En Meta for Developers → Tu App → WhatsApp → Configuration:
- Webhook URL: `https://tu-dominio.vercel.app/api/webhooks/whatsapp`
- Verify Token: valor de `WHATSAPP_VERIFY_TOKEN`

### 4. Deploy
```bash
vercel --prod
```

### 5. Agregar en Vercel env vars
```
NEXT_PUBLIC_URL = https://tu-dominio.vercel.app
```

## Flujo completo

```
Lead escribe en WhatsApp
  → Webhook → Agente Ventas responde con Claude
  → Si quiere agendar → Admin recibe alerta

8am diario (Vercel Cron):
  → Agente Tendencias analiza Riviera Nayarit
  → Agente Contenido genera carrusel
  → Admin recibe propuesta por WhatsApp
  → Admin responde "sí" → Agente Meta Ads publica campaña

Cada 4h (Vercel Cron):
  → Agente Seguimiento detecta leads inactivos
  → Manda follow-up personalizado automático
```

## Stack
- Next.js 16 (App Router) en Vercel
- Supabase (PostgreSQL + pgvector)
- Claude API (claude-sonnet-4-6)
- WhatsApp Business Cloud API
- Meta Marketing API
- Perplexity API

## Costo estimado: ~$55–100 USD/mes
