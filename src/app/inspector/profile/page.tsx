import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  UserCheck,
  ShieldCheck,
  Award,
  CheckCircle2,
  Mail,
  Phone,
  Building,
  Calendar,
} from 'lucide-react';

export const revalidate = 0;

export default async function InspectorProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [dbUser, completedCount, activeCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        memberships: {
          include: { department: true },
        },
      },
    }),
    prisma.inspection.count({
      where: { inspectorId: user.userId, status: 'APPROVED' },
    }),
    prisma.inspection.count({
      where: {
        inspectorId: user.userId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED'] },
      },
    }),
  ]);

  const activeDepartment = dbUser?.memberships?.[0]?.department?.name || 'Field Operations';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Inspector Profile & Certifications
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Authorized field credentials, active certifications, and audit history.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-2xl shadow-sm">
            {dbUser?.name?.charAt(0) || 'I'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{dbUser?.name}</h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                Verified Inspector
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {dbUser?.title || 'Senior Field Inspector'} • {activeDepartment}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <span>{dbUser?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-400" />
            <span>{dbUser?.phone || '+1 (555) 876-5432'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-slate-400" />
            <span>Facility Operations Division</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Member since: {new Date(dbUser?.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Certifications Badge Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Award className="h-4 w-4 text-blue-600" />
          Active Regulatory Accreditations
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <div>
                <span className="font-bold text-slate-900 block">
                  OSHA 30-Hour General Industry Certification
                </span>
                <span className="text-[11px] text-slate-500">ID: OSHA-GI-2024-99841</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Valid through 2028
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <div>
                <span className="font-bold text-slate-900 block">
                  NFPA Fire Suppression & Life Safety Inspector
                </span>
                <span className="text-[11px] text-slate-500">ID: NFPA-CFI-4402</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Valid through 2027
            </span>
          </div>
        </div>
      </div>

      {/* Historical Audit Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <span className="text-3xl font-bold text-emerald-600 block">{completedCount}</span>
          <span className="text-xs text-slate-500 mt-1 block">Certified Audits Completed</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <span className="text-3xl font-bold text-blue-600 block">{activeCount}</span>
          <span className="text-xs text-slate-500 mt-1 block">Current Active Inspections</span>
        </div>
      </div>
    </div>
  );
}
