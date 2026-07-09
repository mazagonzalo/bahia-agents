import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePanelRole } from '@/lib/auth/require-role'

const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED'] as const
type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

// Cola de aprobaciones del harness (AgentApproval) — requiere rol de panel.
export async function GET(req: Request) {
  const access = await requirePanelRole()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const status = new URL(req.url).searchParams.get('status') ?? 'PENDING'
  // Valida contra una allowlist ANTES de tocar Prisma: un valor arbitrario provocaría
  // un PrismaClientValidationError (enum), y el `as` mentiría al type-checker.
  if (status !== 'ALL' && !APPROVAL_STATUSES.includes(status as ApprovalStatus)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  try {
    const approvals = await prisma.agentApproval.findMany({
      where: status === 'ALL' ? {} : { status: status as ApprovalStatus },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({
      approvals: approvals.map((a) => ({
        id: a.id,
        agentType: a.agentType,
        status: a.status,
        proposalData: a.proposalData,
        createdAt: a.createdAt,
        approvedBy: a.approvedBy,
        approvedAt: a.approvedAt,
        executedAt: a.executedAt,
      })),
    })
  } catch (e) {
    console.error('[harness/approvals GET]', e)
    return NextResponse.json({ error: 'error de DB' }, { status: 500 })
  }
}

// Aprobar / rechazar una propuesta PENDIENTE. Escribe AuditLog. NO ejecuta efectos externos.
export async function POST(req: Request) {
  const access = await requirePanelRole()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: 'approve' | 'reject' }
  if (!body.id || (body.action !== 'approve' && body.action !== 'reject')) {
    return NextResponse.json({ error: 'falta id o action (approve|reject)' }, { status: 400 })
  }
  const newStatus: ApprovalStatus = body.action === 'approve' ? 'APPROVED' : 'REJECTED'

  try {
    // Transición SOLO desde PENDING: serializa doble-click / dos managers y bloquea
    // revivir una propuesta ya APPROVED/REJECTED/EXECUTED. La 2ª escritura ve count=0.
    const res = await prisma.agentApproval.updateMany({
      where: { id: body.id, status: 'PENDING' },
      data: { status: newStatus, approvedBy: access.userId, approvedAt: new Date() },
    })
    if (res.count === 0) {
      return NextResponse.json({ error: 'la propuesta no existe o ya no está pendiente' }, { status: 409 })
    }

    const updated = await prisma.agentApproval.findUnique({
      where: { id: body.id },
      select: { agentType: true },
    })
    // AuditLog SOLO en la transición real (no en re-aprobaciones fantasma).
    await prisma.auditLog.create({
      data: {
        action: `proposal.${body.action}d`,
        entity: 'AgentApproval',
        entityId: body.id,
        actorId: access.userId,
        changes: { agentType: updated?.agentType, status: newStatus },
      },
    })
    return NextResponse.json({ ok: true, id: body.id, status: newStatus })
  } catch (e) {
    console.error('[harness/approvals POST]', e)
    return NextResponse.json({ error: 'error de DB' }, { status: 500 })
  }
}
