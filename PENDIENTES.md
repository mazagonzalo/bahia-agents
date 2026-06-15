# Pendientes — Bahía Agents

## Agente de Ventas

- [ ] Reemplazar [URL_SITIO_BAHIA] con el dominio real cuando el sitio esté desplegado
- [ ] Agregar envío de fotos del club en el flujo de ventas (alberca, canchas, gym, restaurante)
- [ ] Calibrar tono y respuestas con equipo de ventas de Bahía
- [ ] Llenar con toda la info posible del club: horarios, torneos, clases, instructores, eventos, reglas, proceso de inscripción, formas de pago, preguntas frecuentes, políticas de invitados

## Agente Secretaria

## Agente de Tendencias

- [ ] Conectar a WhatsApp para que notifique al admin con las tendencias del día
- [ ] Conectar a Instagram Graph API para analizar métricas reales de @bahiaclub.mx (reach, saves, shares por instalación)
- [ ] Conectar a Meta Ads Library con tokens reales (META_APP_ID + META_APP_SECRET) — esperar acceso a cuenta de Bahía
- [ ] Agregar LINKFOXAGENT_API_KEY en Vercel para activar Google Trends real

## Agente de Contenido

## Agente Meta Ads

## Agente de Seguimiento (Instagram)

## Dashboard y dominio

- [ ] Unificar todos los agentes en un solo dashboard — Ventas, Tendencias, Contenido, Secretaria, Meta Ads en una sola página con navegación por secciones
- [ ] Rediseñar dashboard con branding de Bahía: logo, paleta (verde/negro/dorado), tipografía Cormorant Garamond/Bodoni Moda
- [ ] Conectar dominio propio (ej: admin.bahiaclub.mx) con todos los agentes conviviendo
- [ ] Proteger con autenticación para que solo el equipo de Bahía pueda acceder
- [ ] Subir a Vercel Pro para que el dashboard funcione en producción sin timeout (agente de tendencias tarda ~3 min)
- [ ] Activar crons automáticos en Vercel Pro — tendencias corre sola todos los días a las 8am sin tocar nada

## Meta (esperar acceso a cuenta de Bahía)

- [ ] Crear app en Meta for Developers con cuenta de Bahía
- [ ] Conectar WhatsApp Business API (tokens: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, ADMIN_PHONE)
- [ ] Conectar Instagram Graph API (@bahiaclub.mx)
- [ ] Conectar Meta Ads Library y Marketing API (META_APP_ID, META_APP_SECRET, META_AD_ACCOUNT_ID)
- [ ] Construir webhook de Instagram para recibir DMs y comentarios en tiempo real
- [ ] Probar Agente de Ventas vía Instagram DM real

## Infraestructura (cuando se vaya a producción)

- [ ] Evaluar Railway o Render como alternativa a Vercel — servidores siempre encendidos sin timeout, ~$5-7/mes
- [ ] O integrar Trigger.dev para tareas largas (agente de tendencias, crons) — se queda en Vercel para todo lo demás, Trigger.dev corre el trabajo pesado, tier gratis hasta 50k tareas/mes

## General

- [ ] Conectar Instagram DMs como canal principal de leads
- [ ] Conectar WhatsApp como canal secundario
