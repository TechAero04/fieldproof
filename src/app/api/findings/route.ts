export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const inspectionId = searchParams.get('inspectionId');
    const siteId = searchParams.get('siteId');
    const assetId = searchParams.get('assetId');
    const search = searchParams.get('search');

    const where: any = {
      organizationId: auth.organizationId,
    };

    if (status && status !== 'ALL') where.status = status;
    if (severity && severity !== 'ALL') where.severity = severity;
    if (inspectionId) where.inspectionId = inspectionId;
    if (siteId) where.siteId = siteId;
    if (assetId) where.assetId = assetId;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { findingCode: { contains: search } },
        { riskCategory: { contains: search } },
      ];
    }

    const findings = await prisma.finding.findMany({
      where,
      include: {
        inspection: {
          select: { id: true, title: true, status: true, siteName: true },
        },
        site: {
          select: { id: true, name: true, code: true },
        },
        asset: {
          select: { id: true, name: true, assetTag: true },
        },
        correctiveActions: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
        },
        evidence: {
          select: { id: true, fileUrl: true, caption: true, mediaType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ findings });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching findings:', error);
    return NextResponse.json({ error: 'Failed to fetch findings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    const body = await req.json();
    const {
      inspectionId,
      questionId,
      siteId,
      assetId,
      title,
      description,
      severity,
      riskCategory,
      recommendation,
    } = body;

    if (!inspectionId || !title || !description || !riskCategory) {
      return NextResponse.json(
        { error: 'Inspection ID, title, description, and risk category are required' },
        { status: 400 }
      );
    }

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, organizationId: auth.organizationId },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found in organization' }, { status: 404 });
    }

    const count = await prisma.finding.count({
      where: { organizationId: auth.organizationId },
    });
    const findingCode = `FND-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const finding = await prisma.finding.create({
      data: {
        organizationId: auth.organizationId,
        inspectionId,
        questionId: questionId || null,
        siteId: siteId || inspection.siteId,
        assetId: assetId || inspection.assetId,
        findingCode,
        title: title.trim(),
        description: description.trim(),
        severity: severity || 'MEDIUM',
        riskCategory: riskCategory.trim(),
        recommendation: recommendation?.trim() || null,
        status: 'OPEN',
      },
      include: {
        inspection: true,
        site: true,
        asset: true,
      },
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId,
      action: 'FINDING_CREATED',
      entity: 'Finding',
      entityId: finding.id,
      details: `Finding "${findingCode}: ${finding.title}" logged with severity ${finding.severity}`,
    });

    return NextResponse.json({ success: true, finding });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error creating finding:', error);
    return NextResponse.json({ error: 'Failed to create finding' }, { status: 500 });
  }
}
