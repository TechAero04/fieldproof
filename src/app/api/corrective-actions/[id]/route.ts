export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();

    const action = await prisma.correctiveAction.findFirst({
      where: {
        id: params.id,
        organizationId: auth.organizationId,
      },
      include: {
        finding: {
          include: {
            evidence: true,
          },
        },
        inspection: {
          select: { id: true, title: true, siteName: true, siteAddress: true },
        },
        site: true,
        assignee: {
          select: { id: true, name: true, email: true, phone: true, title: true },
        },
        verifier: {
          select: { id: true, name: true, email: true, title: true },
        },
        evidence: true,
        comments: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!action) {
      return NextResponse.json({ error: 'Corrective action not found' }, { status: 404 });
    }

    const isOverdue = action.status !== 'CLOSED' && new Date(action.dueDate) < new Date();

    return NextResponse.json({ action: { ...action, isOverdue } });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching corrective action:', error);
    return NextResponse.json({ error: 'Failed to fetch corrective action' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();
    const body = await req.json();
    const { status, resolutionNotes, assigneeId, dueDate, priority } = body;

    const existing = await prisma.correctiveAction.findFirst({
      where: { id: params.id, organizationId: auth.organizationId },
      include: { finding: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Corrective action not found' }, { status: 404 });
    }

    // Role check: Only managers can close or verify a CAPA
    if (status === 'CLOSED' && !hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden: Only managers can verify and close corrective actions' }, { status: 403 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (resolutionNotes !== undefined) data.resolutionNotes = resolutionNotes;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;
    if (dueDate) data.dueDate = new Date(dueDate);
    if (priority) data.priority = priority;

    if (status === 'PENDING_VERIFICATION') {
      data.completedAt = new Date();
    } else if (status === 'CLOSED') {
      data.verifiedAt = new Date();
      data.verifierId = auth.session.userId;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.correctiveAction.update({
        where: { id: params.id },
        data,
      });

      // If action is closed, check if all actions for this finding are now closed
      if (status === 'CLOSED') {
        const openActionsCount = await tx.correctiveAction.count({
          where: {
            findingId: existing.findingId,
            status: { not: 'CLOSED' },
          },
        });

        if (openActionsCount === 0) {
          await tx.finding.update({
            where: { id: existing.findingId },
            data: { status: 'RESOLVED' },
          });
        }
      }

      return act;
    });

    // Notify assignee if closed or reopened
    if (existing.assigneeId && status) {
      await createNotification({
        organizationId: auth.organizationId,
        userId: existing.assigneeId,
        title: `CAPA Status: ${status.replace('_', ' ')}`,
        message: `Action ${existing.actionCode} updated to ${status} by ${auth.session.name}`,
        type: 'CAPA',
        linkUrl: `/manager/capa/${existing.id}`,
      });
    }

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: existing.inspectionId,
      action: `CAPA_${status || 'UPDATED'}`,
      entity: 'CorrectiveAction',
      entityId: params.id,
      details: `CAPA ${existing.actionCode} updated to status "${status || existing.status}" by ${auth.session.name}`,
    });

    return NextResponse.json({ success: true, action: updated });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error updating corrective action:', error);
    return NextResponse.json({ error: 'Failed to update corrective action' }, { status: 500 });
  }
}
