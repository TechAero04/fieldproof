import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fieldproof-default-secret-key-32-chars-long'
);

export const COOKIE_NAME = 'fieldproof_session';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'MANAGER'
  | 'INSPECTOR'
  | 'ASSIGNEE'
  | 'AUDITOR';

export interface TokenPayload {
  id: string;
  userId: string;
  email: string;
  name: string;
  role?: UserRole | string | null;
  isSuperAdmin: boolean;
  organizationId?: string | null;
  organizationRole?: UserRole | null;
  organizationName?: string | null;
  title?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getFullCurrentUser() {
  const session = await getCurrentUser();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: {
          organization: true,
          department: true,
          team: true,
        },
      },
    },
  });
}

/**
 * Tenant Isolation Guard: Ensures caller is authenticated and belongs to requested tenant.
 */
export async function requireTenantAuth(requestedOrgId?: string): Promise<{
  session: TokenPayload;
  organizationId: string;
  role: UserRole;
  membership?: any;
}> {
  const session = await getCurrentUser();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  let activeOrgId = requestedOrgId || session.organizationId;
  if (!activeOrgId && session.isSuperAdmin) {
    // Default to the first active organization for superadmin if none selected
    const firstOrg = await prisma.organization.findFirst({ where: { status: 'ACTIVE' } });
    activeOrgId = firstOrg?.id || null;
  }

  if (!activeOrgId) {
    throw new Error('NO_ACTIVE_TENANT');
  }

  // Super admin can inspect any organization
  if (session.isSuperAdmin) {
    return {
      session,
      organizationId: activeOrgId,
      role: 'SUPER_ADMIN' as UserRole,
    };
  }

  // Verify membership in database
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: activeOrgId,
      },
    },
    include: { organization: true },
  });

  if (!membership || !membership.isActive || membership.organization.status !== 'ACTIVE') {
    throw new Error('TENANT_ACCESS_DENIED');
  }

  return {
    session,
    organizationId: activeOrgId,
    role: membership.role as UserRole,
    membership,
  };
}

/**
 * Role Permission Validator
 */
export function hasRequiredRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  if (userRole === 'SUPER_ADMIN') return true;
  return allowedRoles.includes(userRole);
}
