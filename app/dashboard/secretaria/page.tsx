'use client'
import { PageHeader, Badge } from '../_components/ui'
import { ChatPanel } from '../_components/ChatPanel'

const INTRO = `Soy la secretaria del sistema. Pregúntame por el estado de los agentes, los leads de la semana (puedes preguntar por un lead por su nombre), las tendencias o los creativos pendientes.

Para aprobar creativos escribe «aprueba» — te listo los borradores y apruebas el que quieras ("aprueba el 2"). Los carruseles entran al ciclo de rotación.`

export default function SecretariaPage() {
  return (
    <>
      <PageHeader
        title="Secretaria"
        blurb="Tu asistente del sistema: lee el estado de todos los agentes, busca leads por nombre y aprueba creativos de forma segura."
        actions={<Badge tone="gold">Aprueba con «aprueba el N»</Badge>}
      />
      <ChatPanel
        endpoint="/api/agents/secretaria"
        placeholder="Pregunta por el estado, por un lead por su nombre, o escribe «aprueba»…"
        intro={INTRO}
      />
    </>
  )
}
