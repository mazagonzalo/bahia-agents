import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// Cola de aprobaciones del harness (AgentApproval) — autenticado.
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'no autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'PENDING'
  try {
    const approvals = await prisma.agentApproval.findMany({
      where: status === 'ALL' ? {} : { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' },
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
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error de DB' }, { status: 500 })
  }
}

// Aprobar / rechazar una propuesta. Escribe AuditLog. NO ejecuta efectos externos.
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'no autorizado' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: 'approve' | 'reject' }
  if (!body.id || (body.action !== 'approve' && body.action !== 'reject')) {
    return NextResponse.json({ error: 'falta id o action (approve|reject)' }, { status: 400 })
  }
  const newStatus = body.action === 'approve' ? 'APPROVED' : 'REJECTED'
  try {
    const updated = await prisma.agentApproval.update({
      where: { id: body.id },
      data: { status: newStatus, approvedBy: userId, approvedAt: new Date() },
    })
    await prisma.auditLog.create({
      data: {
        action: `proposal.${body.action}d`,
        entity: 'AgentApproval',
        entityId: body.id,
        actorId: userId,
        changes: { agentType: updated.agentType, status: newStatus },
      },
    })
    return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error de DB' }, { status: 500 })
  }
}
