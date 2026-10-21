export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'AUDITOR'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to view audit logs' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (!auth.session.isSuperAdmin || auth.organizationId) {
      where.organizationId = auth.organizationId;
    }
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (search) {
      where.OR = [
        { details: { contains: search } },
        { action: { contains: search } },
        { entity: { contains: search } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          organization: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
