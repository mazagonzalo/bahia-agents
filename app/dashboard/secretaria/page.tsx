'use client'
import { PageHeader, Badge } from '../_components/ui'
import { ChatPanel } from '../_components/ChatPanel'

const INTRO = `Soy la secretaria del sistema. Pregúntame por el estado de los agentes, los leads de la semana, las tendencias detectadas o los creativos pendientes.

Para aprobar creativos en borrador escribe «aprobar», «aprueba todo» o «publica» — los enviaré a publicar.`

export default function SecretariaPage() {
  return (
    <>
      <PageHeader
        title="Secretaria"
        blurb="Tu asistente del sistema: lee el estado de todos los agentes y aprueba creativos cuando se lo pidas."
        actions={<Badge tone="gold">Aprueba con «aprueba todo»</Badge>}
      />
      <ChatPanel
        endpoint="/api/agents/secretaria"
        placeholder="Pregunta por el estado del sistema o escribe «aprueba todo»…"
        intro={INTRO}
      />
    </>
  )
}
