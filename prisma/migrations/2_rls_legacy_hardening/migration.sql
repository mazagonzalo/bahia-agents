-- Hardening (Fase 5): RLS deny-by-default en las tablas LEGACY.
--
-- Hoy estas tablas tienen RLS permisivo (USING(true)) o sin RLS (agent_memory),
-- lo que las deja expuestas si se filtra la anon key vía PostgREST.
--
-- El owner (rol `postgres`, que usa Prisma) y `service_role` (que usa supabase-js)
-- BYPASSEAN RLS → la app NO se ve afectada. Esto solo cierra el acceso anónimo/público.

-- 1) Quitar cualquier política permisiva existente en estas tablas.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('leads','conversations','creatives','trends','agent_memory','club_events','club_assets')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2) Habilitar RLS en todas (deny-by-default: sin política → solo owner/service entran).
ALTER TABLE "leads"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "creatives"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trends"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_memory"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "club_events"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "club_assets"   ENABLE ROW LEVEL SECURITY;
