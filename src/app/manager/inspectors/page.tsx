'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Phone, ShieldCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function InspectorsPage() {
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    title: 'Field Safety Inspector',
    department: 'Operations & QA',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInspectors = async () => {
    try {
      const res = await fetch('/api/inspectors');
      const data = await res.json();
      if (res.ok) {
        setInspectors(data.inspectors || []);
      }
    } catch (e) {
      console.error('Error fetching inspectors:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspectors();
  }, []);

  const handleAddInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/inspectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add inspector');
      }

      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        title: 'Field Safety Inspector',
        department: 'Operations & QA',
      });
      await fetchInspectors();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inspector Team Roster
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Certified field personnel, active assignment workloads, and credential management.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Inspector</span>
        </button>
      </div>

      {/* Inspectors Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading team roster...
        </div>
      ) : inspectors.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-slate-200 bg-white">
          <Users className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No inspectors registered</h3>
          <p className="text-xs text-slate-500 mt-1">
            Add field personnel to assign on-site compliance audits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inspectors.map((insp) => (
            <div
              key={insp.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    {insp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{insp.name}</h3>
                    <p className="text-[11px] text-slate-500">{insp.title || 'Inspector'}</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{insp.email}</span>
                </div>
                {insp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{insp.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span>Dept: {insp.department || 'Operations'}</span>
                </div>
              </div>

              {/* Workload Metric Chips */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <span className="block text-xs font-bold text-slate-900">
                    {insp.stats?.assigned || 0}
                  </span>
                  <span className="text-[10px] text-slate-400">Assigned</span>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <span className="block text-xs font-bold text-amber-800">
                    {insp.stats?.inProgress || 0}
                  </span>
                  <span className="text-[10px] text-amber-600">Active</span>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <span className="block text-xs font-bold text-emerald-800">
                    {insp.stats?.completed || 0}
                  </span>
                  <span className="text-[10px] text-emerald-600">Approved</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Inspector Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Add Field Inspector</h2>
            <p className="text-xs text-slate-500">
              Create credentials for field personnel to conduct on-site digital audits.
            </p>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddInspector} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Elena Rostova"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="elena@fieldproof.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Operations & QA"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
