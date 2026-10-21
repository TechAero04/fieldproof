export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const where: any = { organizationId: auth.organizationId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const sites = await prisma.site.findMany({
      where,
      include: {
        _count: {
          select: {
            assets: true,
            inspections: true,
            findings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ sites });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'TENANT_ACCESS_DENIED') return NextResponse.json({ error: 'Access denied to tenant' }, { status: 403 });
    console.error('Error fetching sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, address, city, state, postalCode, latitude, longitude, contactName, contactPhone, contactEmail } = body;

    if (!name || !address) {
      return NextResponse.json({ error: 'Site name and address are required' }, { status: 400 });
    }

    const site = await prisma.site.create({
      data: {
        organizationId: auth.organizationId,
        name: name.trim(),
        code: code?.trim() || null,
        address: address.trim(),
        city: city?.trim() || null,
        state: state?.trim() || null,
        postalCode: postalCode?.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        contactName: contactName?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
      },
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      action: 'SITE_CREATED',
      entity: 'Site',
      entityId: site.id,
      details: `Site "${site.name}" created with code ${site.code || 'N/A'}`,
    });

    return NextResponse.json({ success: true, site });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error creating site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}
