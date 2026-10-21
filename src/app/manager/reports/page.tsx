import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import {
  BarChart3,
  Download,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Building,
  Calendar,
  ShieldAlert,
} from 'lucide-react';

export const revalidate = 0;

export default async function ReportsPage() {
  const [
    totalInspections,
    approvedInspections,
    submittedInspections,
    changesRequestedInspections,
    passCount,
    failCount,
    approvedList,
  ] = await Promise.all([
    prisma.inspection.count(),
    prisma.inspection.count({ where: { status: 'APPROVED' } }),
    prisma.inspection.count({ where: { status: 'SUBMITTED' } }),
    prisma.inspection.count({ where: { status: 'CHANGES_REQUESTED' } }),
    prisma.inspectionResponse.count({ where: { status: 'PASS' } }),
    prisma.inspectionResponse.count({ where: { status: 'FAIL' } }),
    prisma.inspection.findMany({
      where: { status: 'APPROVED' },
      include: {
        template: { select: { title: true, category: true } },
        inspector: { select: { name: true } },
        reviews: {
          select: { reviewedAt: true, reviewer: { select: { name: true } } },
        },
      },
      orderBy: { reviewedAt: 'desc' },
    }),
  ]);

  const totalAudited = passCount + failCount;
  const complianceRate = totalAudited > 0 ? Math.round((passCount / totalAudited) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Compliance & Regulatory Reports
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Historical audit analytics, pass/fail distributions, and exportable certified PDF packages.
        </p>
      </div>

      {/* Analytics Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Overall Compliance Rate
          </span>
          <div className="mt-2 text-3xl font-bold text-emerald-600">{complianceRate}%</div>
          <p className="mt-1 text-xs text-slate-500">
            Based on {totalAudited} audited checklist criteria
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Certified Approved Audits
          </span>
          <div className="mt-2 text-3xl font-bold text-slate-900">{approvedInspections}</div>
          <p className="mt-1 text-xs text-slate-500">
            {totalInspections} total scheduled inspections
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Remediation Required
          </span>
          <div className="mt-2 text-3xl font-bold text-amber-600">
            {changesRequestedInspections}
          </div>
          <p className="mt-1 text-xs text-slate-500">Audits flagged for corrective re-check</p>
        </div>
      </div>

      {/* Distribution Comparison Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Compliance Factor Breakdown
        </h2>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Satisfactory Findings (Pass)
              </span>
              <span className="text-slate-900 font-bold">
                {passCount} ({complianceRate}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full"
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Deficiencies / Safety Violations (Fail)
              </span>
              <span className="text-slate-900 font-bold">
                {failCount} ({100 - complianceRate}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-rose-500 h-2.5 rounded-full"
                style={{ width: `${100 - complianceRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Certified Reports Library */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Approved Compliance Reports Library
            </h2>
            <p className="text-xs text-slate-500">
              Download certified PDF documents with embedded GPS attestation and signatures.
            </p>
          </div>
          <span className="rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            {approvedList.length} Certified Reports
          </span>
        </div>

        {approvedList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No approved inspection reports available yet. Review and approve submitted audits to publish reports.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {approvedList.map((insp) => (
              <div
                key={insp.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>{insp.siteName}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {insp.title} • {insp.template?.title}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Inspector: {insp.inspector?.name} • Certified:{' '}
                    {formatDate(insp.reviews?.[0]?.reviewedAt || insp.updatedAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/manager/inspections/${insp.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View Audit
                  </Link>
                  <a
                    href={`/api/inspections/${insp.id}/pdf`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
