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
    const inspectorId = searchParams.get('inspectorId');
    const siteId = searchParams.get('siteId');
    const assetId = searchParams.get('assetId');
    const search = searchParams.get('search');

    const where: any = {
      organizationId: auth.organizationId,
    };

    // Scoping for Inspectors & Assignees
    if (auth.role === 'INSPECTOR') {
      where.inspectorId = auth.session.userId;
    } else if (inspectorId) {
      where.inspectorId = inspectorId;
    }

    if (siteId) where.siteId = siteId;
    if (assetId) where.assetId = assetId;

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { siteName: { contains: search } },
        { siteAddress: { contains: search } },
      ];
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        template: {
          select: { id: true, title: true, category: true },
        },
        templateVersion: {
          select: { id: true, version: true },
        },
        site: {
          select: { id: true, name: true, code: true, address: true, city: true },
        },
        asset: {
          select: { id: true, name: true, assetTag: true, category: true, status: true },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            responses: true,
            evidence: true,
            findings: true,
            actions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ inspections });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching inspections:', error);
    return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 });
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
      title,
      description,
      templateId,
      templateVersionId: customVersionId,
      siteId,
      assetId,
      inspectorId,
      priority,
      siteName,
      siteAddress,
      dueDate,
    } = body;

    if (!title || !templateId) {
      return NextResponse.json(
        { error: 'Title and template are required' },
        { status: 400 }
      );
    }

    // Resolve template and version
    const template = await prisma.inspectionTemplate.findFirst({
      where: { id: templateId, organizationId: auth.organizationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const versionId = customVersionId || template.versions[0]?.id;
    if (!versionId) {
      return NextResponse.json({ error: 'No published version for this template' }, { status: 400 });
    }

    // Resolve site details
    let finalSiteName = siteName?.trim();
    let finalSiteAddress = siteAddress?.trim();

    if (siteId) {
      const site = await prisma.site.findFirst({
        where: { id: siteId, organizationId: auth.organizationId },
      });
      if (site) {
        finalSiteName = finalSiteName || site.name;
        finalSiteAddress = finalSiteAddress || site.address;
      }
    }

    if (!finalSiteName || !finalSiteAddress) {
      return NextResponse.json(
        { error: 'Site name and address must be provided directly or via a valid site' },
        { status: 400 }
      );
    }

    const inspection = await prisma.$transaction(async (tx) => {
      const created = await tx.inspection.create({
        data: {
          organizationId: auth.organizationId,
          title: title.trim(),
          description: description?.trim() || null,
          templateId,
          templateVersionId: versionId,
          siteId: siteId || null,
          assetId: assetId || null,
          inspectorId: inspectorId || null,
          createdById: auth.session.userId,
          priority: priority || 'MEDIUM',
          status: inspectorId ? 'ASSIGNED' : 'DRAFT',
          siteName: finalSiteName,
          siteAddress: finalSiteAddress,
          dueDate: dueDate ? new Date(dueDate) : null,
          assignments: inspectorId
            ? {
                create: {
                  userId: inspectorId,
                  role: 'LEAD_INSPECTOR',
                },
              }
            : undefined,
        },
        include: {
          template: true,
          templateVersion: true,
          site: true,
          asset: true,
          inspector: true,
        },
      });

      return created;
    });

    // Notify inspector if assigned
    if (inspectorId) {
      await createNotification({
        organizationId: auth.organizationId,
        userId: inspectorId,
        title: 'New Inspection Assigned',
        message: `You have been assigned to conduct: ${inspection.title} at ${finalSiteName}`,
        type: 'ASSIGNMENT',
        linkUrl: `/inspector/inspections/${inspection.id}`,
      });
    }

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: inspection.id,
      action: 'INSPECTION_CREATED',
      entity: 'Inspection',
      entityId: inspection.id,
      details: `Inspection "${inspection.title}" created${inspectorId ? ' and assigned' : ''}`,
    });

    return NextResponse.json({ success: true, inspection });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error creating inspection:', error);
    return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 });
  }
}
