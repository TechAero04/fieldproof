import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.isSuperAdmin) {
      const organizations = await prisma.organization.findMany({
        include: {
          _count: {
            select: {
              memberships: true,
              inspections: true,
              sites: true,
              assets: true,
              findings: true,
              correctiveActions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ organizations });
    }

    // Regular users: return organizations they belong to
    const memberships = await prisma.organizationMembership.findMany({
      where: { userId: user.userId, isActive: true },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                sites: true,
                assets: true,
                inspections: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      organizations: memberships.map((m) => ({
        ...m.organization,
        userRole: m.role,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, industry, website, phone, address } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 6);

    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        industry: industry?.trim() || 'General Operations',
        website: website?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        status: 'ACTIVE',
        memberships: {
          create: {
            userId: user.userId,
            role: 'ORG_ADMIN',
            title: 'Organization Administrator',
          },
        },
      },
    });

    await recordAuditLog({
      organizationId: organization.id,
      userId: user.userId,
      action: 'ORGANIZATION_CREATED',
      entity: 'Organization',
      entityId: organization.id,
      details: `Organization ${organization.name} established by ${user.name}`,
    });

    return NextResponse.json({ success: true, organization });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
