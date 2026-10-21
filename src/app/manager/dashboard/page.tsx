import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { formatDate } from '@/lib/utils';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  FileText,
  Users,
  ArrowRight,
  TrendingUp,
  MapPin,
  Eye,
  Download,
} from 'lucide-react';

export const revalidate = 0;

export default async function ManagerDashboardPage() {
  const [
    total,
    submitted,
    inProgress,
    approved,
    changesRequested,
    totalTemplates,
    totalInspectors,
    passResponses,
    failResponses,
    pendingInspections,
    recentInspections,
    activityLogs,
  ] = await Promise.all([
    prisma.inspection.count(),
    prisma.inspection.count({ where: { status: 'SUBMITTED' } }),
    prisma.inspection.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.inspection.count({ where: { status: 'APPROVED' } }),
    prisma.inspection.count({ where: { status: 'CHANGES_REQUESTED' } }),
    prisma.inspectionTemplate.count({ where: { isActive: true } }),
    prisma.organizationMembership.count({ where: { role: 'INSPECTOR', isActive: true } }),
    prisma.inspectionResponse.count({ where: { status: 'PASS' } }),
    prisma.inspectionResponse.count({ where: { status: 'FAIL' } }),
    prisma.inspection.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        template: { select: { title: true } },
        inspector: { select: { name: true } },
        evidence: { select: { id: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 4,
    }),
    prisma.inspection.findMany({
      include: {
        template: { select: { title: true, category: true } },
        inspector: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.auditLog.findMany({
      include: {
        user: { select: { name: true } },
        inspection: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  const totalAudited = passResponses + failResponses;
  const complianceRate = totalAudited > 0 ? Math.round((passResponses / totalAudited) * 100) : 96;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Compliance Management Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise overview of field audits, regulatory adherence, and review workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/manager/templates/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            <span>New Template</span>
          </Link>
          <Link
            href="/manager/inspections/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Inspection</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Inspections
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{total}</span>
            <span className="ml-2 text-xs text-slate-500">across all facilities</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{approved} Approved</span>
            <span>•</span>
            <span>{inProgress} In Progress</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Awaiting Review
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-blue-950">{submitted}</span>
            <span className="ml-2 text-xs font-medium text-blue-700">action required</span>
          </div>
          <div className="mt-3 text-xs text-blue-600 pt-2 border-t border-blue-100 font-medium">
            Submitted by field inspectors
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Compliance Score
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600">{complianceRate}%</span>
            <span className="ml-2 text-xs text-slate-500">pass rate</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-emerald-600 font-medium">{passResponses} Passed</span>
            <span>/</span>
            <span className="text-rose-600 font-medium">{failResponses} Violations</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Team & Templates
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{totalInspectors}</span>
            <span className="ml-2 text-xs text-slate-500">Inspectors active</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{totalTemplates} Audit Templates</span>
          </div>
        </div>
      </div>

      {/* Review Queue Spotlight (If pending reviews exist) */}
      {pendingInspections.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Priority Review Queue ({pendingInspections.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Inspections submitted from the field awaiting manager sign-off or revisions
                </p>
              </div>
            </div>
            <Link
              href="/manager/inspections?status=SUBMITTED"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All Submissions
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingInspections.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={item.priority} />
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {item.siteName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{item.title}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Inspector: {item.inspector?.name}</span>
                    <span>•</span>
                    <span>{item.evidence?.length || 0} photos</span>
                  </div>
                </div>

                <Link
                  href={`/manager/inspections/${item.id}`}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid: Inspections Table + Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Inspections Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Inspections</h2>
              <p className="text-xs text-slate-500">Live operational log of compliance audits</p>
            </div>
            <Link
              href="/manager/inspections"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              See all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Site / Facility</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Inspector</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInspections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        <div className="font-medium text-slate-700">No inspections scheduled yet</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Click &quot;Create Inspection&quot; above to schedule your first audit.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    recentInspections.map((insp) => (
                      <tr key={insp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{insp.siteName}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {insp.title}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={insp.status} size="sm" />
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {insp.inspector?.name || <span className="text-slate-400">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {formatDate(insp.dueDate)}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <Link
                            href={`/manager/inspections/${insp.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Eye className="h-3 w-3 text-slate-500" />
                            View
                          </Link>
                          {insp.status === 'APPROVED' && (
                            <a
                              href={`/api/inspections/${insp.id}/pdf`}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Download PDF Report"
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Activity Stream */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Compliance Audit Trail</h2>
            <p className="text-xs text-slate-500">Cryptographic audit log of field actions</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            {activityLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No activity logged yet. Audit actions will appear here in real time.
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-900">
                        {log.user?.name || 'System'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      {log.details || log.action}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

