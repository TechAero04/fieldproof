export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { email, password, organizationId } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials or inactive account' },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials or inactive account' },
        { status: 401 }
      );
    }

    // Determine active organization membership
    let activeMembership = user.memberships[0];
    if (organizationId) {
      const match = user.memberships.find((m) => m.organizationId === organizationId);
      if (match) activeMembership = match;
    }

    const userRole = (activeMembership?.role as any) || (user.isSuperAdmin ? 'SUPER_ADMIN' : 'INSPECTOR');

    const token = await createSessionToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: userRole,
      isSuperAdmin: user.isSuperAdmin,
      organizationId: activeMembership?.organizationId || null,
      organizationRole: userRole,
      organizationName: activeMembership?.organization?.name || null,
      title: activeMembership?.title || user.title,
    });

    // Record login audit log
    await recordAuditLog({
      organizationId: activeMembership?.organizationId,
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: `User ${user.email} authenticated successfully`,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        role: activeMembership?.role || (user.isSuperAdmin ? 'SUPER_ADMIN' : 'INSPECTOR'),
        organization: activeMembership?.organization || null,
        memberships: user.memberships.map((m) => ({
          organizationId: m.organizationId,
          organizationName: m.organization.name,
          role: m.role,
        })),
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
