export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, createSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await req.json();
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Verify user belongs to this organization
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.userId,
          organizationId,
        },
      },
      include: { organization: true },
    });

    if (!membership && !user.isSuperAdmin) {
      return NextResponse.json({ error: 'You do not belong to this organization' }, { status: 403 });
    }

    const targetOrg = membership?.organization || await prisma.organization.findUnique({ where: { id: organizationId } });

    if (!targetOrg || targetOrg.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Organization is inactive or not found' }, { status: 400 });
    }

    const token = await createSessionToken({
      id: user.userId,
      userId: user.userId,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      organizationId: targetOrg.id,
      organizationRole: (membership?.role as any) || 'SUPER_ADMIN',
      organizationName: targetOrg.name,
      title: membership?.title || null,
    });

    const response = NextResponse.json({
      success: true,
      message: `Switched active organization to ${targetOrg.name}`,
      activeOrganization: {
        id: targetOrg.id,
        name: targetOrg.name,
        role: membership?.role || 'SUPER_ADMIN',
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Error switching organization:', error);
    return NextResponse.json({ error: 'Failed to switch organization' }, { status: 500 });
  }
}
