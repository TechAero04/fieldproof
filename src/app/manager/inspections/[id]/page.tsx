'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Building,
  User,
  Clock,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  FileCheck2,
  Camera,
  PenTool,
  History,
  Cpu,
  Layers,
} from 'lucide-react';

export default function ManagerInspectionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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

  useEffect(() => {
    if (params.id) {
      fetchInspection();
    }
  }, [params.id]);

  const handleReviewSubmit = async (status: 'APPROVED' | 'CHANGES_REQUESTED') => {
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/inspections/${params.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          feedback,
        }),
      });

      if (res.ok) {
        setReviewAction(null);
        setFeedback('');
        await fetchInspection();
      }
    } catch (e) {
      console.error('Error recording review:', e);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Loading inspection details...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-base font-semibold text-slate-800">Inspection not found</h2>
        <Link href="/manager/inspections" className="mt-4 text-xs font-semibold text-blue-600">
          Back to all inspections
        </Link>
      </div>
    );
  }

  // Calculate statistics
  let passCount = 0;
  let failCount = 0;
  let naCount = 0;
  inspection.responses?.forEach((r: any) => {
    if (r.status === 'PASS' || r.status === 'YES') passCount++;
    else if (r.status === 'FAIL' || r.status === 'NO') failCount++;
    else if (r.status === 'NA') naCount++;
  });
  const totalAudited = passCount + failCount;
  const complianceScore = inspection.complianceScore !== null && inspection.complianceScore !== undefined
    ? inspection.complianceScore
    : (totalAudited > 0 ? Math.round((passCount / totalAudited) * 100) : 100);

  const sections = inspection.templateVersion?.sections || inspection.template?.sections || [];
  const evidenceList = inspection.evidence || inspection.photos || [];
  const gps = inspection.gpsRecords?.[0] || inspection.gpsLocation;
  const signature = inspection.signatures?.[0] || inspection.signature;

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/manager/inspections"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <a
            href={`/api/inspections/${inspection.id}/pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Download Certified PDF</span>
          </a>

          {/* Manager Decision Buttons */}
          {inspection.status === 'SUBMITTED' && (
            <>
              <button
                onClick={() => setReviewAction('REQUEST_CHANGES')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 shadow-sm transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Request Changes</span>
              </button>
              <button
                onClick={() => setReviewAction('APPROVE')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Approve Inspection</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Review Action Modal / Drawer */}
      {reviewAction && (
        <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-md">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
            {reviewAction === 'APPROVE' ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Approve Audit & Issue Certification</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span>Request Inspector Revisions & Remediation</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-600 mb-3">
            {reviewAction === 'APPROVE'
              ? 'Add an optional commendation or approval note to be stamped on the official PDF certificate.'
              : 'Specify exactly what checklist items, photos, or physical corrective actions the inspector must address before approval.'}
          </p>

          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={
              reviewAction === 'APPROVE'
                ? 'e.g. All exit clearances and extinguisher inspections fully verified. Exemplary compliance.'
                : 'e.g. Please re-inspect exit door 2B after warehouse staff clear the obstruction and attach proof photo.'
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
          />

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setReviewAction(null);
                setFeedback('');
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                handleReviewSubmit(
                  reviewAction === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED'
                )
              }
              disabled={submittingReview}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors ${
                reviewAction === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {submittingReview
                ? 'Submitting...'
                : reviewAction === 'APPROVE'
                ? 'Confirm Approval'
                : 'Send Change Request'}
            </button>
          </div>
        </div>
      )}

      {/* Metadata Info Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        <div>
          <span className="text-slate-400 block mb-0.5">Assigned Inspector</span>
          <span className="font-semibold text-slate-800">
            {inspection.inspector?.name || 'Unassigned'}
          </span>
          <span className="text-[11px] text-slate-500 block">{inspection.inspector?.email}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Physical Facility Site</span>
          <span className="font-semibold text-slate-800 truncate block">
            {inspection.siteName}
          </span>
          <span className="text-[11px] text-slate-500 block truncate">{inspection.siteAddress}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Audit Template & Version</span>
          <span className="font-semibold text-slate-800 block">
            {inspection.template?.title}
          </span>
          <span className="text-[11px] text-slate-500">
            v{inspection.templateVersion?.version || 1} • {inspection.template?.category}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Physical Asset Tag</span>
          {inspection.asset ? (
            <div>
              <span className="font-mono font-bold text-blue-700 block">
                {inspection.asset.assetTag}
              </span>
              <span className="text-[11px] text-slate-500">{inspection.asset.name}</span>
            </div>
          ) : (
            <span className="text-slate-500 italic">Facility Wide Check</span>
          )}
        </div>
      </div>

      {/* Compliance Score Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-sm">
            {complianceScore}%
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-xs">
              Audit Compliance Rating
            </div>
            <div className="text-[11px] text-slate-500">
              {passCount} Passed • {failCount} Failed • {naCount} N/A
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 font-medium">{passCount} Pass</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-600 font-medium">{failCount} Fail</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span className="text-slate-600 font-medium">{naCount} N/A</span>
          </div>
        </div>
      </div>

      {/* Deficiencies & Corrective Action Tracking */}
      {inspection.findings && inspection.findings.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/20 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-900">
                Identified Deficiencies & CAPA Plans ({inspection.findings.length})
              </h2>
            </div>
            <Link
              href="/manager/capa"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Manage all CAPAs</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {inspection.findings.map((f: any) => (
              <div key={f.id} className="rounded-lg border border-red-150 bg-white p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                      {f.findingCode}
                    </span>
                    <span className="font-semibold text-slate-900">{f.title}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                    {f.severity}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{f.description}</p>
                {f.recommendation && (
                  <p className="text-blue-700 font-medium mt-1">Remediation: {f.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Checklist Audit Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Checklist Findings & Responses</h2>
          <p className="text-xs text-slate-500">Inspector responses, recorded notes, and evidence</p>
        </div>

        {sections.map((section: any) => (
          <div key={section.id} className="space-y-3">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-xs text-slate-900">{section.title}</h3>
              {section.description && (
                <p className="text-[11px] text-slate-500">{section.description}</p>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {section.questions?.map((q: any) => {
                const resp = inspection.responses?.find((r: any) => r.questionId === q.id);

                return (
                  <div key={q.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 max-w-xl">
                      <p className="font-medium text-slate-800">{q.questionText}</p>
                      {q.helpText && (
                        <p className="text-[11px] text-slate-400 italic">{q.helpText}</p>
                      )}
                      {resp?.notes && (
                        <div className="rounded bg-slate-50 p-2 border border-slate-200 text-slate-600 text-[11px]">
                          <strong>Inspector Notes:</strong> {resp.notes}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {(resp?.status === 'PASS' || resp?.status === 'YES') && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3 w-3" />
                          PASS
                        </span>
                      )}
                      {(resp?.status === 'FAIL' || resp?.status === 'NO') && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          FAIL
                        </span>
                      )}
                      {resp?.status === 'NA' && (
                        <span className="inline-flex items-center rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                          N/A
                        </span>
                      )}
                      {resp?.rating && (
                        <span className="font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                          {resp.rating} / 5 Stars ★
                        </span>
                      )}
                      {resp?.numberValue !== null && resp?.numberValue !== undefined && (
                        <span className="font-mono font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">
                          {resp.numberValue}
                        </span>
                      )}
                      {resp?.textValue && (
                        <span className="text-slate-700 italic">
                          &quot;{resp.textValue}&quot;
                        </span>
                      )}
                      {!resp && (
                        <span className="text-slate-400 italic">No response</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Photographic & Media Evidence */}
      {evidenceList.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Photographic Evidence ({evidenceList.length})
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {evidenceList.map((p: any) => (
              <div
                key={p.id}
                className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
              >
                <div className="aspect-video w-full bg-slate-200 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.fileUrl}
                    alt={p.caption || 'Evidence'}
                    className="h-full w-full object-cover"
                  />
                </div>
                {p.caption && (
                  <p className="p-2 text-[11px] text-slate-600 truncate">{p.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geofence & Digital Signature Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GPS Record */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-xs">GPS & Geofence Attestation</h3>
            </div>
            {gps?.isWithinGeofence !== undefined && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  gps.isWithinGeofence
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {gps.isWithinGeofence ? 'Geofence Validated ✓' : 'Outside Geofence ⚠️'}
              </span>
            )}
          </div>

          {gps ? (
            <div className="text-xs text-slate-600 space-y-1 font-mono">
              <div>Coordinates: {gps.latitude.toFixed(6)}°, {gps.longitude.toFixed(6)}°</div>
              {gps.accuracy && <div>Accuracy Radius: ±{gps.accuracy}m</div>}
              {gps.distanceFromSite !== null && gps.distanceFromSite !== undefined && (
                <div>Distance from Facility: {gps.distanceFromSite}m</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">No GPS coordinates recorded.</div>
          )}
        </div>

        {/* Digital Signature */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-xs">Inspector Digital Signature</h3>
          </div>

          {signature ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 max-h-24 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signature.signatureDataUrl}
                  alt="Signature"
                  className="max-h-20 max-w-full object-contain"
                />
              </div>
              <div className="text-[11px] text-slate-600">
                <strong>Signer:</strong> {signature.signerName} ({signature.signerTitle || signature.signerType || 'Inspector'})
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">Pending inspector sign-off.</div>
          )}
        </div>
      </div>
    </div>
  );
}
