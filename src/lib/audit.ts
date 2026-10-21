import prisma from './prisma';

export interface LogAuditParams {
  organizationId?: string | null;
  userId?: string | null;
  inspectionId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        inspectionId: params.inspectionId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Non-blocking for primary transaction
    return null;
  }
}
