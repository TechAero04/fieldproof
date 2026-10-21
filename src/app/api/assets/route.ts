export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth, hasRequiredRole } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = { organizationId: auth.organizationId };
    if (siteId) where.siteId = siteId;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { assetTag: { contains: search } },
        { category: { contains: search } },
        { modelNumber: { contains: search } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        site: {
          select: { id: true, name: true, address: true },
        },
        _count: {
          select: {
            inspections: true,
            findings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assets });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    if (!hasRequiredRole(auth.role, ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await req.json();
    const { siteId, name, assetTag, category, modelNumber, serialNumber, manufacturer, locationInSite } = body;

    if (!siteId || !name || !assetTag || !category) {
      return NextResponse.json(
        { error: 'Site, asset name, tag number, and category are required' },
        { status: 400 }
      );
    }

    // Check unique tag in tenant
    const existing = await prisma.asset.findUnique({
      where: {
        organizationId_assetTag: {
          organizationId: auth.organizationId,
          assetTag: assetTag.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Asset tag must be unique within your organization' }, { status: 400 });
    }

    // Generate QR verification payload
    const qrPayload = `FIELDPROOF:ASSET:${auth.organizationId}:${assetTag.trim()}`;

    const asset = await prisma.asset.create({
      data: {
        organizationId: auth.organizationId,
        siteId,
        name: name.trim(),
        assetTag: assetTag.trim(),
        category: category.trim(),
        modelNumber: modelNumber?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        manufacturer: manufacturer?.trim() || null,
        locationInSite: locationInSite?.trim() || null,
        qrCodeUrl: qrPayload,
        status: 'OPERATIONAL',
      },
      include: {
        site: true,
      },
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      action: 'ASSET_REGISTERED',
      entity: 'Asset',
      entityId: asset.id,
      details: `Asset "${asset.name}" tagged as ${asset.assetTag} registered at site ${asset.site.name}`,
    });

    return NextResponse.json({ success: true, asset });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
