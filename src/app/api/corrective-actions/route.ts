export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const siteId = searchParams.get('siteId');
    const findingId = searchParams.get('findingId');
    const search = searchParams.get('search');

    const where: any = {
      organizationId: auth.organizationId,
    };

    // If role is ASSIGNEE, only show actions assigned to them
    if (auth.role === 'ASSIGNEE') {
      where.assigneeId = auth.session.userId;
    } else if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (siteId) where.siteId = siteId;
    if (findingId) where.findingId = findingId;
    if (priority && priority !== 'ALL') where.priority = priority;

    if (status && status !== 'ALL') {
      if (status === 'OVERDUE') {
        where.dueDate = { lt: new Date() };
        where.status = { not: 'CLOSED' };
      } else {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { actionCode: { contains: search } },
      ];
    }

    const actions = await prisma.correctiveAction.findMany({
      where,
      include: {
        finding: {
          select: { id: true, findingCode: true, title: true, severity: true, riskCategory: true },
        },
        inspection: {
          select: { id: true, title: true, siteName: true },
        },
        site: {
          select: { id: true, name: true, code: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        verifier: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { comments: true, evidence: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const processed = actions.map((act) => ({
      ...act,
      isOverdue: act.status !== 'CLOSED' && new Date(act.dueDate) < now,
    }));

    return NextResponse.json({ actions: processed });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching corrective actions:', error);
    return NextResponse.json({ error: 'Failed to fetch corrective actions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const body = await req.json();
    const {
      findingId,
      title,
      description,
      priority,
      assigneeId,
      dueDate,
    } = body;

    if (!findingId || !title || !description || !dueDate) {
      return NextResponse.json(
        { error: 'Finding ID, title, description, and due date are required' },
        { status: 400 }
      );
    }

    const finding = await prisma.finding.findFirst({
      where: { id: findingId, organizationId: auth.organizationId },
      include: { inspection: true },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    const count = await prisma.correctiveAction.count({
      where: { organizationId: auth.organizationId },
    });
    const actionCode = `CAPA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const action = await prisma.$transaction(async (tx) => {
      const created = await tx.correctiveAction.create({
        data: {
          organizationId: auth.organizationId,
          inspectionId: finding.inspectionId,
          findingId,
          siteId: finding.siteId,
          actionCode,
          title: title.trim(),
          description: description.trim(),
          priority: priority || 'HIGH',
          status: assigneeId ? 'ASSIGNED' : 'OPEN',
          assigneeId: assigneeId || null,
          dueDate: new Date(dueDate),
        },
        include: {
          assignee: true,
          finding: true,
          inspection: true,
        },
      });

      // Update finding status to CAPA_CREATED
      await tx.finding.update({
        where: { id: findingId },
        data: { status: 'CAPA_CREATED' },
      });

      return created;
    });

    // Notify assignee
    if (assigneeId) {
      await createNotification({
        organizationId: auth.organizationId,
        userId: assigneeId,
        title: 'Corrective Action Assigned (CAPA)',
        message: `You have been assigned: ${action.actionCode} - "${action.title}". Due date: ${new Date(dueDate).toLocaleDateString()}`,
        type: 'CAPA',
        linkUrl: `/manager/capa/${action.id}`,
      });
    }

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: finding.inspectionId,
      action: 'CAPA_CREATED',
      entity: 'CorrectiveAction',
      entityId: action.id,
      details: `Corrective Action "${actionCode}: ${action.title}" created and assigned to ${action.assignee?.name || 'Unassigned'}`,
    });

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error creating corrective action:', error);
    return NextResponse.json({ error: 'Failed to create corrective action' }, { status: 500 });
  }
}
