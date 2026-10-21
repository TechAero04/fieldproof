export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole, hashPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const auth = await requireTenantAuth();

    const members = await prisma.organizationMembership.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            title: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
          },
        },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        membershipId: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        role: m.role,
        title: m.title || m.user.title,
        department: m.department?.name || 'Operations',
        team: m.team?.name || 'General',
        isActive: m.isActive && m.user.isActive,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden: Organization admin privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, title, departmentName } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, initial password, and role are required' },
        { status: 400 }
      );
    }

    const validRoles = ['ORG_ADMIN', 'MANAGER', 'INSPECTOR', 'ASSIGNEE', 'AUDITOR'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
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
          title: title?.trim() || null,
        },
      });
    }

    // Check existing membership in this tenant
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
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Resolve Department if provided
    let departmentId: string | null = null;
    if (departmentName && departmentName.trim()) {
      const dept = await prisma.department.upsert({
        where: {
          organizationId_name: {
            organizationId: auth.organizationId,
            name: departmentName.trim(),
          },
        },
        update: {},
        create: {
          organizationId: auth.organizationId,
          name: departmentName.trim(),
        },
      });
      departmentId = dept.id;
    }

    const membership = await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: auth.organizationId,
        role,
        title: title?.trim() || null,
        departmentId,
      },
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      action: 'MEMBER_ADDED',
      entity: 'OrganizationMembership',
      entityId: membership.id,
      details: `User ${user.email} added with role ${role} to organization`,
    });

    return NextResponse.json({ success: true, membership });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error creating member:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
