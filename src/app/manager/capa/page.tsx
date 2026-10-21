'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Search,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function CapaPage() {
  const [activeTab, setActiveTab] = useState<'actions' | 'findings'>('actions');
  const [actions, setActions] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateCapaModal, setShowCreateCapaModal] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [selectedActionForComment, setSelectedActionForComment] = useState<any | null>(null);
  const [newComment, setNewComment] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // CAPA Form
  const [capaForm, setCapaForm] = useState({
    findingId: '',
    title: '',
    description: '',
    priority: 'HIGH',
    assigneeId: '',
    dueDate: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [actionsRes, findingsRes, inspectorsRes] = await Promise.all([
        fetch('/api/corrective-actions'),
        fetch('/api/findings'),
        fetch('/api/inspectors'),
      ]);
      const actionsData = await actionsRes.json();
      const findingsData = await findingsRes.json();
      const inspectorsData = await inspectorsRes.json();

      if (actionsData.actions) setActions(actionsData.actions);
      if (findingsData.findings) setFindings(findingsData.findings);
      if (inspectorsData.inspectors) setInspectors(inspectorsData.inspectors);
    } catch (err) {
      console.error('Failed to load CAPA data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/corrective-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capaForm),
      });
      if (res.ok) {
        setShowCreateCapaModal(false);
        setCapaForm({
          findingId: '',
          title: '',
          description: '',
          priority: 'HIGH',
          assigneeId: '',
          dueDate: '',
        });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create CAPA');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (actionId: string, status: string, notes?: string) => {
    try {
      const res = await fetch(`/api/corrective-actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolutionNotes: notes }),
      });
      if (res.ok) {
        fetchData();
        if (selectedActionForComment?.id === actionId) {
          setSelectedActionForComment(null);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update action');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionForComment || !newComment.trim()) return;

    try {
      const res = await fetch(`/api/corrective-actions/${selectedActionForComment.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });
      if (res.ok) {
        setNewComment('');
        // Refresh single action comments
        const updatedRes = await fetch(`/api/corrective-actions/${selectedActionForComment.id}`);
        const updatedData = await updatedRes.json();
        if (updatedData.action) setSelectedActionForComment(updatedData.action);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredActions = actions.filter((act) => {
    if (statusFilter === 'OVERDUE' && !act.isOverdue) return false;
    if (statusFilter !== 'ALL' && statusFilter !== 'OVERDUE' && act.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        act.title.toLowerCase().includes(q) ||
        act.actionCode.toLowerCase().includes(q) ||
        (act.assignee?.name && act.assignee.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const openFindingsCount = findings.filter((f) => f.status === 'OPEN').length;
  const overdueCount = actions.filter((a) => a.isOverdue).length;
  const pendingVerificationCount = actions.filter((a) => a.status === 'PENDING_VERIFICATION').length;
  const closedCount = actions.filter((a) => a.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Corrective & Preventive Actions (CAPA)
          </h1>
          <p className="text-sm text-slate-500">
            Remediate non-compliance findings, assign remediation owners, and verify closure.
          </p>
        </div>

        <button
          onClick={() => {
            setCapaForm({
              findingId: findings[0]?.id || '',
              title: '',
              description: '',
              priority: 'HIGH',
              assigneeId: inspectors[0]?.id || '',
              dueDate: '',
            });
            setShowCreateCapaModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Create CAPA Plan
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Open Deficiencies</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{openFindingsCount}</div>
          <div className="mt-1 text-[11px] text-amber-600 font-medium">Pending action plans</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Overdue Actions</span>
            <Clock className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600">{overdueCount}</div>
          <div className="mt-1 text-[11px] text-red-500 font-medium">Exceeded SLA deadline</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Pending Verification</span>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{pendingVerificationCount}</div>
          <div className="mt-1 text-[11px] text-blue-500 font-medium">Ready for manager sign-off</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Closed & Verified</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{closedCount}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">100% compliance restored</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'actions'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Corrective Actions ({actions.length})
          </button>
          <button
            onClick={() => setActiveTab('findings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'findings'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Audit Findings & Deficiencies ({findings.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'actions' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="CLOSED">Closed & Verified</option>
            </select>
          )}

          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Table / Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading CAPA workflows...</div>
      ) : activeTab === 'actions' ? (
        <div className="space-y-3">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
              No corrective actions match criteria.
            </div>
          ) : (
            filteredActions.map((act) => (
              <div
                key={act.id}
                className={`rounded-xl border bg-white p-4 shadow-xs transition hover:shadow-sm ${
                  act.isOverdue ? 'border-red-200 bg-red-50/10' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {act.actionCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          act.priority === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : act.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {act.priority}
                      </span>
                      {act.isOverdue && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm mt-1">{act.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{act.description}</p>
                  </div>

                  {/* Actions & Status Pill */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        act.status === 'CLOSED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : act.status === 'PENDING_VERIFICATION'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {act.status.replace('_', ' ')}
                    </span>

                    {/* Verification Button for Manager */}
                    {act.status === 'PENDING_VERIFICATION' && (
                      <button
                        onClick={() => handleUpdateStatus(act.id, 'CLOSED', 'Manager verified physical remediation.')}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                      >
                        Verify & Close
                      </button>
                    )}

                    {act.status !== 'CLOSED' && act.status !== 'PENDING_VERIFICATION' && (
                      <button
                        onClick={() => handleUpdateStatus(act.id, 'PENDING_VERIFICATION', 'Inspector completed remedial action.')}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-blue-700"
                      >
                        Submit for Verification
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedActionForComment(act)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{act._count?.comments || 0}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-4">
                    <span>Assignee: <strong className="text-slate-700">{act.assignee?.name || 'Unassigned'}</strong></span>
                    <span>Site: <strong className="text-slate-700">{act.site?.name || 'Facility'}</strong></span>
                  </div>
                  <div>
                    <span>Due: <strong className={act.isOverdue ? 'text-red-600' : 'text-slate-700'}>{new Date(act.dueDate).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {findings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
              No open findings logged. All inspections passed standard compliance.
            </div>
          ) : (
            findings.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                        {f.findingCode}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        {f.riskCategory}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                        {f.severity}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm mt-1">{f.title}</h3>
                    <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                    {f.recommendation && (
                      <p className="text-xs text-blue-700 mt-1 font-medium">
                        Recommendation: {f.recommendation}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      f.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {f.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Inspection: {f.inspection?.title || 'Safety Check'}</span>
                  {f.status === 'OPEN' && (
                    <button
                      onClick={() => {
                        setCapaForm({
                          findingId: f.id,
                          title: `Remediate: ${f.title}`,
                          description: f.recommendation || f.description,
                          priority: f.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                          assigneeId: inspectors[0]?.id || '',
                          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                        });
                        setShowCreateCapaModal(true);
                      }}
                      className="rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      + Create Remediation Plan
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create CAPA Modal */}
      {showCreateCapaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Initiate Corrective Action (CAPA)</h2>
            <p className="text-xs text-slate-500 mt-1">
              Create an accountable remediation task linked to an audit deficiency.
            </p>

            <form onSubmit={handleCreateCapa} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Linked Finding *</label>
                <select
                  required
                  value={capaForm.findingId}
                  onChange={(e) => setCapaForm({ ...capaForm, findingId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select finding...</option>
                  {findings.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.findingCode}: {f.title} ({f.severity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Action Plan Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Replace Emergency Exit Sign and Test Battery Circuit"
                  value={capaForm.title}
                  onChange={(e) => setCapaForm({ ...capaForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Detailed Action Protocol *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify exact steps to remediate and verify the deficiency..."
                  value={capaForm.description}
                  onChange={(e) => setCapaForm({ ...capaForm, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Assignee Owner *</label>
                  <select
                    required
                    value={capaForm.assigneeId}
                    onChange={(e) => setCapaForm({ ...capaForm, assigneeId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select assignee...</option>
                    {inspectors.map((insp) => (
                      <option key={insp.id} value={insp.id}>
                        {insp.name} ({insp.title || 'Inspector'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={capaForm.dueDate}
                    onChange={(e) => setCapaForm({ ...capaForm, dueDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCapaModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                >
                  Assign Action Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comment & Resolution Modal */}
      {selectedActionForComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-blue-700">{selectedActionForComment.actionCode}</span>
                <h3 className="font-bold text-slate-900 text-sm mt-0.5">{selectedActionForComment.title}</h3>
              </div>
              <button
                onClick={() => setSelectedActionForComment(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2 border-y border-slate-100 py-3">
              {(!selectedActionForComment.comments || selectedActionForComment.comments.length === 0) ? (
                <div className="text-center py-4 text-xs text-slate-400">No comments posted yet.</div>
              ) : (
                selectedActionForComment.comments.map((c: any) => (
                  <div key={c.id} className="rounded-lg bg-slate-50 p-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-700 font-semibold text-[11px]">
                      <span>{c.user?.name || 'Team Member'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{new Date(c.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Write a progress update or note..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
