export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await requireTenantAuth();
    const orgId = auth.organizationId;
    const now = new Date();

    if (auth.role === 'INSPECTOR') {
      const [total, assigned, inProgress, submitted, approved, changesRequested] = await Promise.all([
        prisma.inspection.count({ where: { organizationId: orgId, inspectorId: auth.session.userId } }),
        prisma.inspection.count({ where: { organizationId: orgId, inspectorId: auth.session.userId, status: 'ASSIGNED' } }),
        prisma.inspection.count({ where: { organizationId: orgId, inspectorId: auth.session.userId, status: 'IN_PROGRESS' } }),
        prisma.inspection.count({ where: { organizationId: orgId, inspectorId: auth.session.userId, status: 'SUBMITTED' } }),
        prisma.inspection.count({ where: { organizationId: orgId, inspectorId: auth.session.userId, status: 'APPROVED' } }),
        prisma.inspection.count({ where: { organizationId: orgId, inspectorId: auth.session.userId, status: 'CHANGES_REQUESTED' } }),
      ]);

      const recentInspections = await prisma.inspection.findMany({
        where: { organizationId: orgId, inspectorId: auth.session.userId },
        include: {
          template: { select: { title: true, category: true } },
          site: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });

      return NextResponse.json({
        stats: {
          total,
          assigned,
          inProgress,
          submitted,
          approved,
          changesRequested,
        },
        recentInspections,
      });
    }

    if (auth.role === 'ASSIGNEE') {
      const [totalCapa, assignedCapa, inProgressCapa, pendingVerificationCapa, closedCapa, overdueCapa] = await Promise.all([
        prisma.correctiveAction.count({ where: { organizationId: orgId, assigneeId: auth.session.userId } }),
        prisma.correctiveAction.count({ where: { organizationId: orgId, assigneeId: auth.session.userId, status: 'ASSIGNED' } }),
        prisma.correctiveAction.count({ where: { organizationId: orgId, assigneeId: auth.session.userId, status: 'IN_PROGRESS' } }),
        prisma.correctiveAction.count({ where: { organizationId: orgId, assigneeId: auth.session.userId, status: 'PENDING_VERIFICATION' } }),
        prisma.correctiveAction.count({ where: { organizationId: orgId, assigneeId: auth.session.userId, status: 'CLOSED' } }),
        prisma.correctiveAction.count({
          where: {
            organizationId: orgId,
            assigneeId: auth.session.userId,
            dueDate: { lt: now },
            status: { not: 'CLOSED' },
          },
        }),
      ]);

      const recentActions = await prisma.correctiveAction.findMany({
        where: { organizationId: orgId, assigneeId: auth.session.userId },
        include: {
          finding: { select: { findingCode: true, title: true, severity: true } },
          site: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      });

      return NextResponse.json({
        stats: {
          totalCapa,
          assignedCapa,
          inProgressCapa,
          pendingVerificationCapa,
          closedCapa,
          overdueCapa,
        },
        recentActions,
      });
    }

    // Manager / Org Admin / Auditor metrics
    const [
      total,
      assigned,
      inProgress,
      submitted,
      approved,
      changesRequested,
      rejected,
      totalTemplates,
      totalInspectors,
      totalSites,
      totalAssets,
      totalFindings,
      openFindings,
      resolvedFindings,
      highSeverityFindings,
      totalCapa,
      openCapa,
      pendingCapa,
      closedCapa,
      overdueCapa,
    ] = await Promise.all([
      prisma.inspection.count({ where: { organizationId: orgId } }),
      prisma.inspection.count({ where: { organizationId: orgId, status: 'ASSIGNED' } }),
      prisma.inspection.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }),
      prisma.inspection.count({ where: { organizationId: orgId, status: 'SUBMITTED' } }),
      prisma.inspection.count({ where: { organizationId: orgId, status: 'APPROVED' } }),
      prisma.inspection.count({ where: { organizationId: orgId, status: 'CHANGES_REQUESTED' } }),
      prisma.inspection.count({ where: { organizationId: orgId, status: 'REJECTED' } }),
      prisma.inspectionTemplate.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.organizationMembership.count({ where: { organizationId: orgId, role: 'INSPECTOR', isActive: true } }),
      prisma.site.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.asset.count({ where: { organizationId: orgId } }),
      prisma.finding.count({ where: { organizationId: orgId } }),
      prisma.finding.count({ where: { organizationId: orgId, status: { in: ['OPEN', 'CAPA_CREATED'] } } }),
      prisma.finding.count({ where: { organizationId: orgId, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.finding.count({ where: { organizationId: orgId, severity: { in: ['HIGH', 'CRITICAL'] } } }),
      prisma.correctiveAction.count({ where: { organizationId: orgId } }),
      prisma.correctiveAction.count({ where: { organizationId: orgId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      prisma.correctiveAction.count({ where: { organizationId: orgId, status: 'PENDING_VERIFICATION' } }),
      prisma.correctiveAction.count({ where: { organizationId: orgId, status: 'CLOSED' } }),
      prisma.correctiveAction.count({
        where: {
          organizationId: orgId,
          dueDate: { lt: now },
          status: { not: 'CLOSED' },
        },
      }),
    ]);

    // Average Compliance Score
    const scoredInspections = await prisma.inspection.findMany({
      where: {
        organizationId: orgId,
        complianceScore: { not: null },
      },
      select: { complianceScore: true },
    });

    const averageScore = scoredInspections.length > 0
      ? Math.round(scoredInspections.reduce((acc, curr) => acc + (curr.complianceScore || 0), 0) / scoredInspections.length)
      : 96;

    const recentInspections = await prisma.inspection.findMany({
      where: { organizationId: orgId },
      include: {
        template: { select: { title: true, category: true } },
        inspector: { select: { name: true, email: true } },
        site: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const recentActivity = await prisma.auditLog.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { name: true } },
        inspection: { select: { title: true, siteName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return NextResponse.json({
      stats: {
        total,
        assigned,
        inProgress,
        submitted,
        approved,
        changesRequested,
        rejected,
        totalTemplates,
        totalInspectors,
        totalSites,
        totalAssets,
        complianceRate: averageScore,
        totalFindings,
        openFindings,
        resolvedFindings,
        highSeverityFindings,
        totalCapa,
        openCapa,
        pendingCapa,
        closedCapa,
        overdueCapa,
      },
      recentInspections,
      recentActivity,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
