'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  PlayCircle,
  Download,
  Building,
  Calendar,
  CheckCircle,
  MapPin,
  Camera,
  PenTool,
  AlertTriangle,
} from 'lucide-react';

export default function InspectorInspectionDetailsPage() {
  const params = useParams();
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInspection = async () => {
      try {
        const res = await fetch(`/api/inspections/${params.id}`);
        const data = await res.json();
        if (res.ok) {
          setInspection(data.inspection);
        }
      } catch (e) {
        console.error('Error fetching inspection:', e);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchInspection();
  }, [params.id]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading audit details...</div>;
  }

  if (!inspection) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-base font-semibold text-slate-800">Inspection not found</h2>
        <Link href="/inspector/inspections" className="text-xs text-blue-600 mt-2 block">
          Back to My Inspections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/inspector/inspections"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                {inspection.siteName}
              </h1>
              <StatusBadge status={inspection.status} />
              <PriorityBadge priority={inspection.priority} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{inspection.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED'].includes(inspection.status) && (
            <Link
              href={`/inspector/inspections/${inspection.id}/conduct`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
            >
              <PlayCircle className="h-4 w-4" />
              <span>
                {inspection.status === 'IN_PROGRESS'
                  ? 'Resume Checklist'
                  : inspection.status === 'CHANGES_REQUESTED'
                  ? 'Revise & Resubmit'
                  : 'Start Audit'}
              </span>
            </Link>
          )}

          {inspection.status === 'APPROVED' && (
            <a
              href={`/api/inspections/${inspection.id}/pdf`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Download Official PDF</span>
            </a>
          )}
        </div>
      </div>

      {/* Details Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Audit Scope & Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Facility Address</span>
            <span className="font-semibold text-slate-800">{inspection.siteAddress}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Template Framework</span>
            <span className="font-semibold text-slate-800">{inspection.template?.title}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Scheduled Due Date</span>
            <span className="font-semibold text-slate-800">{formatDate(inspection.dueDate)}</span>
          </div>
        </div>

        {inspection.description && (
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600">
            <strong>Scope Notes:</strong> {inspection.description}
          </div>
        )}
      </div>

      {/* Review Feedback if present */}
      {inspection.reviews?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Manager Review Sign-Off
          </h2>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                Decision: <StatusBadge status={inspection.reviews[0].status} size="sm" />
              </span>
              <span className="text-slate-400">
                {formatDateTime(inspection.reviews[0].reviewedAt)}
              </span>
            </div>
            {inspection.reviews[0].feedback && (
              <p className="text-slate-700 italic">
                &quot;{inspection.reviews[0].feedback}&quot;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
