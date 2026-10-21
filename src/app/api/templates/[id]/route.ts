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

    const template = await prisma.inspectionTemplate.findFirst({
      where: {
        id: params.id,
        organizationId: auth.organizationId,
        isActive: true,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        versions: {
          orderBy: { version: 'desc' },
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
        _count: {
          select: { inspections: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const latestVersion = template.versions[0];

    return NextResponse.json({
      template: {
        id: template.id,
        title: template.title,
        description: template.description,
        category: template.category,
        currentVersion: template.currentVersion,
        createdBy: template.createdBy,
        sections: latestVersion?.sections || [],
        versions: template.versions,
        inspectionsCount: template._count.inspections,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, category, sections, scoringRule } = body;

    const existing = await prisma.inspectionTemplate.findFirst({
      where: { id: params.id, organizationId: auth.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const newVersionNumber = existing.currentVersion + 1;

    // Create a new immutable version and update template master
    const updated = await prisma.$transaction(async (tx) => {
      await tx.inspectionTemplate.update({
        where: { id: params.id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          category: category.trim(),
          currentVersion: newVersionNumber,
        },
      });

      return tx.templateVersion.create({
        data: {
          templateId: params.id,
          version: newVersionNumber,
          title: title.trim(),
          description: description?.trim() || null,
          scoringRule: scoringRule ? JSON.stringify(scoringRule) : null,
          isPublished: true,
          sections: {
            create: sections.map((sec: any, secIdx: number) => ({
              title: sec.title.trim(),
              description: sec.description?.trim() || null,
              orderIndex: secIdx,
              questions: {
                create: (sec.questions || []).map((q: any, qIdx: number) => ({
                  questionText: q.questionText.trim(),
                  questionType: q.questionType || 'PASS_FAIL_NA',
                  options: q.options ? JSON.stringify(q.options) : null,
                  isRequired: q.isRequired ?? true,
                  requirePhoto: q.requirePhoto ?? false,
                  helpText: q.helpText?.trim() || null,
                  conditionalRule: q.conditionalRule ? JSON.stringify(q.conditionalRule) : null,
                  weight: q.weight ? parseFloat(q.weight) : 1.0,
                  orderIndex: qIdx,
                })),
              },
            })),
          },
        },
        include: {
          sections: {
            include: { questions: true },
          },
        },
      });
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      action: 'TEMPLATE_UPDATED',
      entity: 'InspectionTemplate',
      entityId: params.id,
      details: `Template "${title}" updated to Version ${newVersionNumber}`,
    });

    return NextResponse.json({ success: true, version: updated });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const template = await prisma.inspectionTemplate.findFirst({
      where: { id: params.id, organizationId: auth.organizationId },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await prisma.inspectionTemplate.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      action: 'TEMPLATE_ARCHIVED',
      entity: 'InspectionTemplate',
      entityId: params.id,
      details: `Template "${template.title}" archived`,
    });

    return NextResponse.json({ success: true, message: 'Template archived' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error archiving template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
