'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, Building, MapPin, Calendar, UserCheck, FileText, AlertCircle, Cpu } from 'lucide-react';

export default function NewInspectionPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [inspectorId, setInspectorId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [siteId, setSiteId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [templatesRes, inspectorsRes, sitesRes, assetsRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/inspectors'),
          fetch('/api/sites'),
          fetch('/api/assets'),
        ]);

        const templatesData = await templatesRes.json();
        const inspectorsData = await inspectorsRes.json();
        const sitesData = await sitesRes.json();
        const assetsData = await assetsRes.json();

        if (templatesData.templates) {
          setTemplates(templatesData.templates);
          if (templatesData.templates.length > 0) {
            setTemplateId(templatesData.templates[0].id);
          }
        }

        if (inspectorsData.inspectors) {
          setInspectors(inspectorsData.inspectors);
          if (inspectorsData.inspectors.length > 0) {
            setInspectorId(inspectorsData.inspectors[0].id);
          }
        }

        if (sitesData.sites) {
          setSites(sitesData.sites);
          if (sitesData.sites.length > 0) {
            const firstSite = sitesData.sites[0];
            setSiteId(firstSite.id);
            setSiteName(firstSite.name);
            setSiteAddress(firstSite.address);
          }
        }

        if (assetsData.assets) {
          setAssets(assetsData.assets);
        }
      } catch (err: any) {
        console.error('Error loading setup data:', err);
      } finally {
        setFetching(false);
      }
    };

    loadDependencies();
  }, []);

  const handleSiteChange = (selectedId: string) => {
    setSiteId(selectedId);
    setAssetId('');
    const site = sites.find((s) => s.id === selectedId);
    if (site) {
      setSiteName(site.name);
      setSiteAddress(site.address);
    }
  };

  const filteredAssets = assets.filter((a) => !siteId || a.siteId === siteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          templateId,
          siteId: siteId || null,
          assetId: assetId || null,
          inspectorId: inspectorId || null,
          priority,
          siteName,
          siteAddress,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create inspection');
      }

      router.push('/manager/inspections');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/manager/inspections"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Schedule Field Inspection
          </h1>
          <p className="text-xs text-slate-500">
            Define facility scope, link physical assets, assign inspector, and select compliance audit template.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inspection Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Inspection Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Fire Safety & Egress Audit"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Description & Special Instructions
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter scope details, security check-in codes, or special hazards..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Template & Inspector Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                Audit Template *
              </label>
              <select
                required
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({tpl.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                Assign Inspector
              </label>
              <select
                value={inspectorId}
                onChange={(e) => setInspectorId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="">Leave unassigned (Claim in field)</option>
                {inspectors.map((insp) => (
                  <option key={insp.id} value={insp.id}>
                    {insp.name} ({insp.department || insp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Facility Site & Physical Asset Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-500" />
                Select Facility Site
              </label>
              <select
                value={siteId}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="">-- Custom Manual Location --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || s.city || 'Facility'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-slate-500" />
                Linked Physical Asset (Optional)
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="">-- Facility Wide (No specific asset) --</option>
                {filteredAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} [{a.assetTag}] - {a.category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Manual Site Name & Address Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-500" />
                Site / Facility Name *
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Apex Central Distribution Center"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                Facility Physical Address *
              </label>
              <input
                type="text"
                required
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="e.g. 1040 Logistics Blvd, Dallas, TX"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Audit Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="LOW">Low - Routine</option>
                <option value="MEDIUM">Medium - Standard Compliance</option>
                <option value="HIGH">High - Immediate Priority</option>
                <option value="CRITICAL">Critical - Mandatory Regulatory Deadline</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Link
              href="/manager/inspections"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || fetching}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none transition-colors disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{loading ? 'Creating Inspection...' : 'Create & Assign Inspection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
