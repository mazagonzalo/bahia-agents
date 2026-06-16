import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Init perezoso: el cliente se crea en el primer uso (runtime), no al importar.
// Evita que `next build` truene cuando las env vars no están presentes
// (recolección de page-data) y que cualquier CI sin secretos falle.
let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      throw new Error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY en el entorno')
    }
    _client = createClient(url, key)
  }
  return _client
}

// Proxy para conservar la API `supabase.from(...)` en quienes ya lo usan,
// difiriendo la creación real del cliente hasta el primer acceso.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient() as object, prop, receiver)
  },
})
