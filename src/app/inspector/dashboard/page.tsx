import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { formatDate } from '@/lib/utils';
import {
  ClipboardList,
  PlayCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building,
  ArrowRight,
  Shield,
  MapPin,
  Calendar,
} from 'lucide-react';

export const revalidate = 0;

export default async function InspectorDashboardPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const [
    totalAssigned,
    inProgress,
    changesRequested,
    completed,
    activeTasks,
  ] = await Promise.all([
    prisma.inspection.count({
      where: { inspectorId: user.userId, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED'] } },
    }),
    prisma.inspection.count({
      where: { inspectorId: user.userId, status: 'IN_PROGRESS' },
    }),
    prisma.inspection.count({
      where: { inspectorId: user.userId, status: 'CHANGES_REQUESTED' },
    }),
    prisma.inspection.count({
      where: { inspectorId: user.userId, status: 'APPROVED' },
    }),
    prisma.inspection.findMany({
      where: {
        inspectorId: user.userId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED'] },
      },
      include: {
        template: { select: { title: true, category: true } },
        reviews: {
          select: { feedback: true, status: true },
          orderBy: { reviewedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { priority: 'desc' },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur-sm mb-2">
              <Shield className="h-3.5 w-3.5 text-blue-200" />
              <span>Inspector Field Station</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold">
              Welcome, {user.name}
            </h1>
            <p className="text-xs text-blue-100 mt-1 max-w-lg">
              You have {totalAssigned} on-site inspections requiring attention. Record findings, evidence photos, and digital signatures.
            </p>
          </div>

          <Link
            href="/inspector/inspections"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-md hover:bg-blue-50 transition-colors self-start sm:self-auto"
          >
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <span>View My Audits</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Pending Tasks
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{totalAssigned}</span>
          <span className="text-[10px] text-slate-400">Assigned to you</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
            Drafts In Progress
          </span>
          <span className="text-2xl font-bold text-amber-900 mt-1 block">{inProgress}</span>
          <span className="text-[10px] text-amber-700">Can resume anytime</span>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-orange-800 uppercase tracking-wider block">
            Changes Requested
          </span>
          <span className="text-2xl font-bold text-orange-900 mt-1 block">{changesRequested}</span>
          <span className="text-[10px] text-orange-700">Manager feedback</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
            Completed & Approved
          </span>
          <span className="text-2xl font-bold text-emerald-900 mt-1 block">{completed}</span>
          <span className="text-[10px] text-emerald-700">Certified by manager</span>
        </div>
      </div>

      {/* Active Inspections List */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Field Audits</h2>
            <p className="text-xs text-slate-500">Pick an audit to start or resume checklist verification</p>
          </div>
          <Link
            href="/inspector/inspections"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            See all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No pending inspections. Check back when a manager assigns a new audit.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-blue-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <StatusBadge status={task.status} size="sm" />
                    <PriorityBadge priority={task.priority} />
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{task.siteName}</h3>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{task.title}</p>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{task.siteAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Due: {formatDate(task.dueDate)}</span>
                    </div>
                  </div>

                  {/* Manager revision note alert */}
                  {task.status === 'CHANGES_REQUESTED' && task.reviews?.[0]?.feedback && (
                    <div className="mt-3 rounded-lg bg-orange-100/70 p-2.5 text-[11px] text-orange-800 border border-orange-200">
                      <strong>Manager Note:</strong> &quot;{task.reviews[0].feedback}&quot;
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Template: {task.template?.category}
                  </span>
                  <Link
                    href={`/inspector/inspections/${task.id}/conduct`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>
                      {task.status === 'IN_PROGRESS'
                        ? 'Resume Audit'
                        : task.status === 'CHANGES_REQUESTED'
                        ? 'Revise & Resubmit'
                        : 'Start Inspection'}
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
