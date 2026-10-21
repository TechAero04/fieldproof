import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();

    const inspection = await prisma.inspection.findFirst({
      where: {
        id: params.id,
        organizationId: auth.organizationId,
      },
      include: {
        template: true,
        templateVersion: {
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
        site: true,
        asset: true,
        inspector: {
          select: { id: true, name: true, email: true, phone: true, title: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        responses: {
          include: {
            question: true,
          },
        },
        evidence: {
          orderBy: { uploadedAt: 'desc' },
        },
        gpsRecords: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        signatures: true,
        findings: {
          include: {
            correctiveActions: {
              include: {
                assignee: { select: { id: true, name: true, email: true } },
              },
            },
            evidence: true,
          },
        },
        actions: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            verifier: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, title: true },
            },
          },
          orderBy: { reviewedAt: 'desc' },
        },
        auditLogs: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Role check: If inspector, ensure they are assigned
    if (auth.role === 'INSPECTOR' && inspection.inspectorId !== auth.session.userId) {
      return NextResponse.json({ error: 'Forbidden: You are not assigned to this inspection' }, { status: 403 });
    }

    return NextResponse.json({ inspection });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching inspection:', error);
    return NextResponse.json({ error: 'Failed to fetch inspection' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();
    const body = await req.json();
    const { status, inspectorId, priority, dueDate } = body;

    const existing = await prisma.inspection.findFirst({
      where: { id: params.id, organizationId: auth.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (inspectorId !== undefined) data.inspectorId = inspectorId;
    if (priority) data.priority = priority;
    if (dueDate) data.dueDate = new Date(dueDate);

    if (status === 'IN_PROGRESS' && !existing.startedAt) {
      data.startedAt = new Date();
    }

    const updated = await prisma.inspection.update({
      where: { id: params.id },
      data,
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: params.id,
      action: status || 'INSPECTION_UPDATED',
      entity: 'Inspection',
      entityId: params.id,
      details: `Inspection updated by ${auth.session.name} (${auth.role})`,
    });

    return NextResponse.json({ success: true, inspection: updated });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error updating inspection:', error);
    return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 });
  }
}
