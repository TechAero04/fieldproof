import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole, hashPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const auth = await requireTenantAuth();

    const memberships = await prisma.organizationMembership.findMany({
      where: {
        organizationId: auth.organizationId,
        role: { in: ['INSPECTOR', 'MANAGER', 'ASSIGNEE'] },
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            title: true,
            isActive: true,
            createdAt: true,
            assignedInspections: {
              where: { organizationId: auth.organizationId },
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        department: true,
      },
      orderBy: { user: { name: 'asc' } },
    });

    const formatted = memberships.map((m) => {
      const assigned = m.user.assignedInspections.filter((i) => i.status === 'ASSIGNED').length;
      const inProgress = m.user.assignedInspections.filter((i) => i.status === 'IN_PROGRESS').length;
      const completed = m.user.assignedInspections.filter((i) => i.status === 'APPROVED').length;
      const total = m.user.assignedInspections.length;

      return {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        title: m.title || m.user.title || 'Field Inspector',
        department: m.department?.name || 'Operations',
        role: m.role,
        isActive: m.user.isActive,
        createdAt: m.user.createdAt,
        stats: {
          total,
          assigned,
          inProgress,
          completed,
        },
      };
    });

    return NextResponse.json({ inspectors: formatted });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching inspectors:', error);
    return NextResponse.json({ error: 'Failed to fetch inspectors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, phone, title, role = 'INSPECTOR' } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and initial password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const passwordHash = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          phone: phone?.trim() || null,
          title: title?.trim() || 'Field Inspector',
          isActive: true,
        },
      });
    }

    // Check existing membership in this organization
    const existingMembership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: auth.organizationId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'This user is already a member of this organization' },
        { status: 400 }
      );
    }

    const membership = await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: auth.organizationId,
        role: role || 'INSPECTOR',
        title: title?.trim() || 'Field Inspector',
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      action: 'MEMBER_ADDED',
      entity: 'OrganizationMembership',
      entityId: membership.id,
      details: `Added ${user.name} (${user.email}) with role ${membership.role}`,
    });

    return NextResponse.json({
      success: true,
      inspector: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        title: membership.title,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error creating inspector:', error);
    return NextResponse.json({ error: 'Failed to create inspector' }, { status: 500 });
  }
}
