'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SignaturePad } from '@/components/SignaturePad';
import { GpsCapture, GpsData } from '@/components/GpsCapture';
import { PhotoUpload, PhotoItem } from '@/components/PhotoUpload';
import {
  cacheInspectionOffline,
  getCachedInspection,
  queueOfflineMutation,
  syncPendingMutations,
} from '@/lib/offline-sync';
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Star,
  Camera,
  AlertTriangle,
  Building,
  Check,
  MessageSquare,
  HelpCircle,
  Wifi,
  WifiOff,
  Shield,
  Layers,
  MapPin,
} from 'lucide-react';

interface ResponseState {
  questionId: string;
  status?: string | null;
  notes: string;
  rating?: number | null;
  numberValue?: number | string;
  textValue?: string;
  selectedOptions?: string[];
}

export default function ConductInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Form State
  const [responses, setResponses] = useState<Record<string, ResponseState>>({});
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [gpsLocation, setGpsLocation] = useState<GpsData | null>(null);
  const [signature, setSignature] = useState<{
    signatureDataUrl: string;
    signerName: string;
    signerRole: string;
  } | null>(null);

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingMutations().then(({ synced }) => {
        if (synced > 0) {
          setToastMsg({ type: 'info', text: `Reconnected! Synced ${synced} offline mutations with cloud.` });
          setTimeout(() => setToastMsg(null), 5000);
        }
      });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchInspection = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inspections/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setInspection(data.inspection);
        cacheInspectionOffline(data.inspection);

        // Prepopulate responses
        const respMap: Record<string, ResponseState> = {};
        data.inspection.responses?.forEach((r: any) => {
          let parsedOpts: string[] = [];
          if (r.selectedOptions) {
            try {
              parsedOpts = JSON.parse(r.selectedOptions);
            } catch {}
          }
          respMap[r.questionId] = {
            questionId: r.questionId,
            status: r.status,
            notes: r.notes || '',
            rating: r.rating,
            numberValue: r.numberValue ?? '',
            textValue: r.textValue || '',
            selectedOptions: parsedOpts,
          };
        });
        setResponses(respMap);

        // Prepopulate evidence / photos
        const ev = data.inspection.evidence || data.inspection.photos;
        if (ev && Array.isArray(ev)) {
          setPhotos(ev);
        }

        // Prepopulate GPS
        const gps = data.inspection.gpsRecords?.[0] || data.inspection.gpsLocation;
        if (gps) {
          setGpsLocation(gps);
        }

        // Prepopulate Signature
        const sig = data.inspection.signatures?.[0] || data.inspection.signature;
        if (sig) {
          setSignature({
            signatureDataUrl: sig.signatureDataUrl,
            signerName: sig.signerName,
            signerRole: sig.signerTitle || sig.signerRole || 'Inspector',
          });
        }
      } else {
        // Fallback to offline cache
        const cached = await getCachedInspection(params.id as string);
        if (cached) {
          setInspection(cached);
          setToastMsg({ type: 'info', text: 'Loaded inspection from local offline cache.' });
        }
      }
    } catch (e) {
      console.error('Error loading inspection:', e);
      const cached = await getCachedInspection(params.id as string);
      if (cached) {
        setInspection(cached);
        setToastMsg({ type: 'info', text: 'Working offline from local cache.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchInspection();
    }
  }, [params.id]);

  const updateResponse = (questionId: string, partial: Partial<ResponseState>) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { questionId, notes: '' }),
        ...partial,
      },
    }));
  };

  // Resolve sections from V2 templateVersion or template
  const sections = inspection?.templateVersion?.sections || inspection?.template?.sections || [];
  const currentSection = sections[activeSectionIdx];

  // Helper to test conditional question display
  const shouldDisplayQuestion = (q: any): boolean => {
    if (!q.conditionalRule) return true;
    try {
      const rule = typeof q.conditionalRule === 'string' ? JSON.parse(q.conditionalRule) : q.conditionalRule;
      if (rule.dependsOnQuestionId && rule.showWhenValue) {
        const dependentResponse = responses[rule.dependsOnQuestionId];
        return dependentResponse?.status === rule.showWhenValue;
      }
    } catch {}
    return true;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setToastMsg(null);
    const payload = {
      responses: Object.values(responses),
      evidence: photos,
      gpsLocation,
      signature,
    };

    if (!navigator.onLine) {
      await queueOfflineMutation('SAVE_DRAFT', params.id as string, payload);
      setToastMsg({ type: 'info', text: 'Saved to local offline queue. Will sync automatically when connected.' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/inspections/${params.id}/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setToastMsg({ type: 'success', text: 'Audit draft saved successfully to database.' });
        setTimeout(() => setToastMsg(null), 4000);
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (err: any) {
      // Queue offline on network failure
      await queueOfflineMutation('SAVE_DRAFT', params.id as string, payload);
      setToastMsg({ type: 'info', text: 'Network unreachable. Queued draft offline.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitInspection = async () => {
    setSubmitting(true);
    setToastMsg(null);

    // Validation
    const allQuestions: any[] = [];
    sections.forEach((s: any) => {
      s.questions?.forEach((q: any) => {
        if (shouldDisplayQuestion(q)) allQuestions.push(q);
      });
    });

    const unanswered = allQuestions.filter(
      (q) =>
        q.isRequired &&
        (q.questionType === 'PASS_FAIL_NA' || q.questionType === 'YES_NO') &&
        !responses[q.id]?.status
    );

    if (unanswered.length > 0) {
      setToastMsg({
        type: 'error',
        text: `Please answer all required checklist questions (${unanswered.length} remaining).`,
      });
      setSubmitting(false);
      return;
    }

    if (!signature?.signatureDataUrl) {
      setToastMsg({
        type: 'error',
        text: 'Inspector digital signature is required before official submission.',
      });
      setSubmitting(false);
      return;
    }

    const payload = {
      responses: Object.values(responses),
      evidence: photos,
      gpsLocation,
      signature,
    };

    if (!navigator.onLine) {
      await queueOfflineMutation('SUBMIT_INSPECTION', params.id as string, payload);
      setToastMsg({
        type: 'info',
        text: 'Offline submission queued! Will sync and notify manager automatically on reconnection.',
      });
      setSubmitting(false);
      setTimeout(() => router.push('/inspector/inspections'), 2000);
      return;
    }

    try {
      const res = await fetch(`/api/inspections/${params.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inspection');
      }

      setToastMsg({
        type: 'success',
        text: `Inspection submitted! Score: ${data.complianceScore}%. Redirecting...`,
      });

      setTimeout(() => {
        router.push('/inspector/inspections');
      }, 1500);
    } catch (err: any) {
      await queueOfflineMutation('SUBMIT_INSPECTION', params.id as string, payload);
      setToastMsg({
        type: 'info',
        text: 'Network error. Queued submission offline for automatic synchronization.',
      });
      setTimeout(() => router.push('/inspector/inspections'), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500">
        Loading digital checklist questions...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="py-16 text-center text-xs text-slate-500">
        Inspection record not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Offline Status Alert Banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500 text-white px-4 py-2.5 text-xs font-semibold shadow-md">
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode Active • Checklists, photos, and signatures are saving to local IndexedDB storage.</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/inspector/inspections/${inspection.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {inspection.template?.category || 'Compliance Audit'}
            </span>
            <PriorityBadge priority={inspection.priority} />
            {isOnline ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Wifi className="h-3 w-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <WifiOff className="h-3 w-3" /> Offline Queue
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            {inspection.title}
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Building className="h-3.5 w-3.5" />
            <span>{inspection.siteName} • {inspection.siteAddress}</span>
            {inspection.asset && (
              <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-semibold">
                Asset: {inspection.asset.assetTag}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {toastMsg && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-medium border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toastMsg.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : toastMsg.type === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          ) : (
            <Shield className="h-4 w-4 text-blue-600 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Section Navigation Tabs */}
      {sections.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {sections.map((sec: any, idx: number) => {
            const isCompleted = sec.questions?.every((q: any) => responses[q.id]?.status);
            return (
              <button
                key={sec.id || idx}
                onClick={() => setActiveSectionIdx(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  activeSectionIdx === idx
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{sec.title}</span>
                {isCompleted && (
                  <Check className={`h-3.5 w-3.5 ${activeSectionIdx === idx ? 'text-white' : 'text-emerald-600'}`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Checklist Section Form */}
      {currentSection && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="text-xs text-slate-500 mt-0.5">{currentSection.description}</p>
            )}
          </div>

          <div className="space-y-6">
            {currentSection.questions
              ?.filter((q: any) => shouldDisplayQuestion(q))
              .map((q: any, qIdx: number) => {
                const resp = responses[q.id] || { questionId: q.id, notes: '' };
                const parsedOptions = q.options
                  ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options)
                  : [];

                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-slate-150 bg-slate-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{qIdx + 1}</span>
                          <span className="text-sm font-semibold text-slate-900">{q.questionText}</span>
                          {q.isRequired && <span className="text-xs font-bold text-red-500">*</span>}
                        </div>
                        {q.helpText && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{q.helpText}</span>
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {q.questionType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Question Type Inputs */}
                    <div className="pt-1">
                      {/* 1. PASS / FAIL / NA */}
                      {(q.questionType === 'PASS_FAIL_NA' || !q.questionType) && (
                        <div className="grid grid-cols-3 gap-2 sm:w-80">
                          <button
                            type="button"
                            onClick={() => updateResponse(q.id, { status: 'PASS' })}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                              resp.status === 'PASS'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => updateResponse(q.id, { status: 'FAIL' })}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                              resp.status === 'FAIL'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <XCircle className="h-4 w-4" /> Fail
                          </button>
                          <button
                            type="button"
                            onClick={() => updateResponse(q.id, { status: 'NA' })}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                              resp.status === 'NA'
                                ? 'bg-slate-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <MinusCircle className="h-4 w-4" /> N/A
                          </button>
                        </div>
                      )}

                      {/* 2. YES / NO */}
                      {q.questionType === 'YES_NO' && (
                        <div className="grid grid-cols-2 gap-2 sm:w-60">
                          <button
                            type="button"
                            onClick={() => updateResponse(q.id, { status: 'YES' })}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                              resp.status === 'YES'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateResponse(q.id, { status: 'NO' })}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                              resp.status === 'NO'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <XCircle className="h-4 w-4" /> No
                          </button>
                        </div>
                      )}

                      {/* 3. SINGLE CHOICE / DROPDOWN */}
                      {(q.questionType === 'SINGLE_CHOICE' || q.questionType === 'DROPDOWN') && (
                        <select
                          value={resp.textValue || ''}
                          onChange={(e) => updateResponse(q.id, { textValue: e.target.value })}
                          className="w-full sm:w-72 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select option...</option>
                          {parsedOptions.map((opt: string, i: number) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* 4. MULTI CHOICE */}
                      {q.questionType === 'MULTI_CHOICE' && (
                        <div className="space-y-1.5">
                          {parsedOptions.map((opt: string, i: number) => {
                            const isChecked = (resp.selectedOptions || []).includes(opt);
                            return (
                              <label key={i} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const curr = resp.selectedOptions || [];
                                    const next = e.target.checked
                                      ? [...curr, opt]
                                      : curr.filter((item) => item !== opt);
                                    updateResponse(q.id, { selectedOptions: next });
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. TEXT */}
                      {q.questionType === 'TEXT' && (
                        <textarea
                          rows={2}
                          value={resp.textValue || ''}
                          onChange={(e) => updateResponse(q.id, { textValue: e.target.value })}
                          placeholder="Type response findings..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      )}

                      {/* 6. NUMBER & MEASUREMENT */}
                      {(q.questionType === 'NUMBER' || q.questionType === 'MEASUREMENT') && (
                        <div className="flex items-center gap-2 sm:w-60">
                          <input
                            type="number"
                            step="any"
                            value={resp.numberValue ?? ''}
                            onChange={(e) => updateResponse(q.id, { numberValue: e.target.value })}
                            placeholder="Enter measured value..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* 7. DATE & TIME */}
                      {q.questionType === 'DATE' && (
                        <input
                          type="date"
                          value={resp.textValue || ''}
                          onChange={(e) => updateResponse(q.id, { textValue: e.target.value })}
                          className="w-full sm:w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      )}

                      {q.questionType === 'TIME' && (
                        <input
                          type="time"
                          value={resp.textValue || ''}
                          onChange={(e) => updateResponse(q.id, { textValue: e.target.value })}
                          className="w-full sm:w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      )}

                      {/* 8. RATING */}
                      {q.questionType === 'RATING' && (
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => updateResponse(q.id, { rating: star })}
                              className="p-1 focus:outline-none"
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  (resp.rating || 0) >= star
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-semibold text-slate-600 ml-2">
                            {resp.rating ? `${resp.rating} / 5 Stars` : 'Not rated'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes & Evidence Attachment Box */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Add specific comments, defect details, or notes..."
                        value={resp.notes || ''}
                        onChange={(e) => updateResponse(q.id, { notes: e.target.value })}
                        className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Geofence & Geolocation Verification Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Geolocation & Geofence Verification</h3>
              <p className="text-xs text-slate-500">Capture device GPS coordinates to prove on-site presence.</p>
            </div>
          </div>
          {gpsLocation?.isWithinGeofence !== undefined && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                gpsLocation.isWithinGeofence
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {gpsLocation.isWithinGeofence ? 'Geofence Validated ✓' : 'Outside Geofence ⚠️'}
            </span>
          )}
        </div>
        <GpsCapture onLocationCaptured={(loc) => setGpsLocation(loc)} />
      </div>

      {/* Photo & Video Evidence Gallery */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Evidence Photos & Attachments</h3>
            <p className="text-xs text-slate-500">Upload photos of deficiencies, serial badges, or completed work.</p>
          </div>
        </div>
        <PhotoUpload
          photos={photos}
          onPhotosChange={(updated) => setPhotos(updated)}
        />
      </div>

      {/* Digital Signature Pad */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Inspector Attestation & Digital Signature</h3>
            <p className="text-xs text-slate-500">Sign digitally to certify inspection findings and accuracy.</p>
          </div>
        </div>
        <SignaturePad
          onSignatureSave={(sigDataUrl, name, role) => {
            setSignature({
              signatureDataUrl: sigDataUrl,
              signerName: name,
              signerRole: role,
            });
            setToastMsg({ type: 'success', text: 'Digital signature captured.' });
            setTimeout(() => setToastMsg(null), 3000);
          }}
        />
      </div>

      {/* Action Footer Bar */}
      <div className="sticky bottom-4 z-30 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        <button
          type="button"
          onClick={handleSubmitInspection}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition"
        >
          <Send className="h-4 w-4" />
          <span>{submitting ? 'Submitting...' : 'Submit Audit for Review'}</span>
        </button>
      </div>
    </div>
  );
}
