export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();

    const finding = await prisma.finding.findFirst({
      where: {
        id: params.id,
        organizationId: auth.organizationId,
      },
      include: {
        inspection: true,
        site: true,
        asset: true,
        evidence: true,
        correctiveActions: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            verifier: { select: { id: true, name: true, email: true } },
            comments: {
              include: { user: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    return NextResponse.json({ finding });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching finding:', error);
    return NextResponse.json({ error: 'Failed to fetch finding' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();
    const body = await req.json();
    const { status, severity, recommendation, description } = body;

    const existing = await prisma.finding.findFirst({
      where: { id: params.id, organizationId: auth.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (severity) data.severity = severity;
    if (recommendation !== undefined) data.recommendation = recommendation;
    if (description) data.description = description;

    const updated = await prisma.finding.update({
      where: { id: params.id },
      data,
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: existing.inspectionId,
      action: 'FINDING_UPDATED',
      entity: 'Finding',
      entityId: params.id,
      details: `Finding "${existing.findingCode}" updated by ${auth.session.name}`,
    });

    return NextResponse.json({ success: true, finding: updated });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error updating finding:', error);
    return NextResponse.json({ error: 'Failed to update finding' }, { status: 500 });
  }
}
