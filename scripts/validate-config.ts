// Validación de neutralidad funcional: muestra cómo el sistema resuelve la marca
// desde lib/client.config. Corre `npx tsx scripts/validate-config.ts`.
// Si cambias client.config a otra empresa, TODO lo de abajo cambia con ella.
import { CLIENT } from '@/lib/client.config'
import { VENTAS_SYSTEM_PROMPT } from '@/lib/agents/prompts/ventas-system-prompt'

function accentFor(hint: string) {
  const s = (hint || '').toLowerCase()
  for (const { match, accent } of CLIENT.brand.accentBySport) if (match.some((m) => s.includes(m))) return accent
  return CLIENT.brand.accentDefault
}
const padel = accentFor('padel')

console.log('=== VALIDACIÓN CONFIG-DRIVEN ===')
console.log('Empresa        :', CLIENT.name, '·', CLIENT.location.city + ',', CLIENT.location.state)
console.log('Membresía top  :', CLIENT.memberships[0].name, CLIENT.memberships[0].price)
console.log('Sidebar/wordmark:', CLIENT.brand.wordmark, '·', CLIENT.brand.sidebarLogo)
console.log('Color primario :', CLIENT.brand.primaryColor)
console.log('Acento "padel" :', JSON.stringify(padel), '→ logo', CLIENT.brand.logoByGlow[padel.glow] ?? CLIENT.brand.logoDefault)
console.log('Foto "padel"   :', CLIENT.photoBySport.find((p) => p.match.some((m) => 'padel'.includes(m)))?.photo ?? CLIENT.photoDefault)
console.log('--- Prompt VENTAS (primeras 3 líneas, generado desde el config) ---')
console.log(VENTAS_SYSTEM_PROMPT.split('\n').slice(0, 3).join('\n'))
