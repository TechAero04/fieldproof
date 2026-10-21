import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const body = await req.json();
    const { status, feedback } = body;

    if (!status || !['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be APPROVED, CHANGES_REQUESTED, or REJECTED' },
        { status: 400 }
      );
    }

    const inspection = await prisma.inspection.findFirst({
      where: { id: params.id, organizationId: auth.organizationId },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // 1. Create review entry
    const review = await prisma.inspectionReview.create({
      data: {
        inspectionId: params.id,
        reviewerId: auth.session.userId,
        status,
        feedback: feedback?.trim() || null,
        reviewedAt: new Date(),
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true, title: true },
        },
      },
    });

    // 2. Update inspection status
    const updatedInspection = await prisma.inspection.update({
      where: { id: params.id },
      data: {
        status,
        reviewedAt: new Date(),
      },
    });

    // 3. Notify the assigned inspector
    if (inspection.inspectorId) {
      await createNotification({
        organizationId: auth.organizationId,
        userId: inspection.inspectorId,
        title: `Inspection ${status.replace('_', ' ')}`,
        message: `Manager ${auth.session.name} ${status === 'APPROVED' ? 'approved' : 'reviewed'} your inspection: "${inspection.title}".${feedback ? ` Feedback: ${feedback}` : ''}`,
        type: 'REVIEW',
        linkUrl: `/inspector/inspections/${inspection.id}`,
      });
    }

    // 4. Audit Log
    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: params.id,
      action: `INSPECTION_${status}`,
      entity: 'Inspection',
      entityId: params.id,
      details: `Manager ${auth.session.name} marked inspection as ${status}.${feedback ? ` Feedback: "${feedback}"` : ''}`,
    });

    return NextResponse.json({
      success: true,
      message: `Inspection review recorded: ${status}`,
      review,
      inspection: updatedInspection,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error reviewing inspection:', error);
    return NextResponse.json({ error: 'Failed to record review' }, { status: 500 });
  }
}
