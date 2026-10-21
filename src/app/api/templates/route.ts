export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = {
      organizationId: auth.organizationId,
      isActive: true,
    };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const templates = await prisma.inspectionTemplate.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        versions: {
          where: { isPublished: true },
          orderBy: { version: 'desc' },
          take: 1,
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
      orderBy: { createdAt: 'desc' },
    });

    const formatted = templates.map((tpl) => {
      const activeVersion = tpl.versions[0];
      return {
        id: tpl.id,
        title: tpl.title,
        description: tpl.description,
        category: tpl.category,
        currentVersion: tpl.currentVersion,
        createdBy: tpl.createdBy,
        sections: activeVersion?.sections || [],
        totalQuestions: activeVersion?.sections.reduce((acc, s) => acc + s.questions.length, 0) || 0,
        inspectionsCount: tpl._count.inspections,
      };
    });

    return NextResponse.json({ templates: formatted });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to create templates' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, category, sections, scoringRule } = body;

    if (!title || !category || !sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: 'Title, category, and at least one checklist section are required' },
        { status: 400 }
      );
    }

    // Create Template with initial Version 1
    const template = await prisma.inspectionTemplate.create({
      data: {
        organizationId: auth.organizationId,
        title: title.trim(),
        description: description?.trim() || null,
        category: category.trim(),
        currentVersion: 1,
        createdById: auth.session.userId,
        versions: {
          create: {
            version: 1,
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
        },
      },
      include: {
        versions: {
          include: {
            sections: {
              include: { questions: true },
            },
          },
        },
      },
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      action: 'TEMPLATE_CREATED',
      entity: 'InspectionTemplate',
      entityId: template.id,
      details: `Template "${template.title}" created with Version 1`,
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
