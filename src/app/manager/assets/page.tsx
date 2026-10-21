'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Cpu,
  Plus,
  MapPin,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Search,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';

export default function AssetsAndSitesPage() {
  const [activeTab, setActiveTab] = useState<'sites' | 'assets'>('sites');
  const [sites, setSites] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  // Forms
  const [siteForm, setSiteForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    latitude: '',
    longitude: '',
    contactName: '',
    contactPhone: '',
  });

  const [assetForm, setAssetForm] = useState({
    siteId: '',
    name: '',
    assetTag: '',
    category: 'HVAC System',
    modelNumber: '',
    serialNumber: '',
    locationInSite: '',
    status: 'OPERATIONAL',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sitesRes, assetsRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/assets'),
      ]);
      const sitesData = await sitesRes.json();
      const assetsData = await assetsRes.json();

      if (sitesData.sites) setSites(sitesData.sites);
      if (assetsData.assets) setAssets(assetsData.assets);
    } catch (err) {
      console.error('Failed to load sites & assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteForm),
      });
      if (res.ok) {
        setShowSiteModal(false);
        setSiteForm({
          name: '',
          code: '',
          address: '',
          city: '',
          state: '',
          latitude: '',
          longitude: '',
          contactName: '',
          contactPhone: '',
        });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create site');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm),
      });
      if (res.ok) {
        setShowAssetModal(false);
        setAssetForm({
          siteId: '',
          name: '',
          assetTag: '',
          category: 'HVAC System',
          modelNumber: '',
          serialNumber: '',
          locationInSite: '',
          status: 'OPERATIONAL',
        });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create asset');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSites = sites.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code && s.code.toLowerCase().includes(search.toLowerCase())) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.assetTag.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase()) ||
    (a.site?.name && a.site.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sites & Physical Assets
          </h1>
          <p className="text-sm text-slate-500">
            Manage physical facility locations, geofences, and scannable QR asset tags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'sites' ? (
            <button
              onClick={() => setShowSiteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add Facility Site
            </button>
          ) : (
            <button
              onClick={() => setShowAssetModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Register Asset Tag
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('sites')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'sites'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Facility Sites ({sites.length})
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'assets'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Cpu className="h-4 w-4" />
            Equipment & Assets ({assets.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading directory data...</div>
      ) : activeTab === 'sites' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSites.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              No facility sites found. Click "Add Facility Site" to create one.
            </div>
          ) : (
            filteredSites.map((site) => (
              <div
                key={site.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{site.name}</h3>
                      {site.code && (
                        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600 mt-0.5">
                          {site.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{site.address}{site.city ? `, ${site.city}` : ''}</span>
                  </div>

                  {site.latitude && site.longitude && (
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <Shield className="h-3.5 w-3.5 text-blue-500" />
                      <span>GPS Geofence: {site.latitude.toFixed(4)}°, {site.longitude.toFixed(4)}°</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{site._count?.assets || 0} Registered Assets</span>
                  <span>{site._count?.inspections || 0} Inspections</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              No assets registered. Click "Register Asset Tag" to catalog equipment.
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      {asset.category}
                    </span>
                    <h3 className="font-semibold text-slate-900 text-sm mt-0.5">{asset.name}</h3>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      asset.status === 'OPERATIONAL'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {asset.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Scannable Tag Simulation Box */}
                <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Asset Identifier Code</div>
                    <div className="text-xs font-mono font-bold text-slate-900">{asset.assetTag}</div>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-white border border-slate-200 text-slate-700 shadow-xs">
                    <QrCode className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>Location: {asset.site?.name || 'Assigned Site'}</span>
                  </div>
                  {asset.locationInSite && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      <span>Area: {asset.locationInSite}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{asset._count?.inspections || 0} Inspections</span>
                  <span>{asset._count?.findings || 0} Findings</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Site Modal */}
      {showSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Add New Facility Site</h2>
            <p className="text-xs text-slate-500 mt-1">
              Create a physical location for conducting compliance inspections.
            </p>

            <form onSubmit={handleCreateSite} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Site Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Distribution Hub"
                  value={siteForm.name}
                  onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Site Code</label>
                  <input
                    type="text"
                    placeholder="e.g. DAL-WH-04"
                    value={siteForm.code}
                    onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">City / State</label>
                  <input
                    type="text"
                    placeholder="Dallas, TX"
                    value={siteForm.city}
                    onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10400 Tech Logistics Parkway"
                  value={siteForm.address}
                  onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Latitude (for Geofence)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="32.7767"
                    value={siteForm.latitude}
                    onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Longitude (for Geofence)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-96.7970"
                    value={siteForm.longitude}
                    onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSiteModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                >
                  Save Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Register Physical Asset</h2>
            <p className="text-xs text-slate-500 mt-1">
              Tag an equipment unit with a unique barcode/QR identifier for compliance checks.
            </p>

            <form onSubmit={handleCreateAsset} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Assigned Facility Site *</label>
                <select
                  required
                  value={assetForm.siteId}
                  onChange={(e) => setAssetForm({ ...assetForm, siteId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select a facility site...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || s.address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Carrier Chiller Unit #2"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Asset Tag / QR Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AST-DAL-001"
                    value={assetForm.assetTag}
                    onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Category</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="HVAC System">HVAC System</option>
                    <option value="Fire Suppression">Fire Suppression</option>
                    <option value="Heavy Crane">Heavy Crane</option>
                    <option value="Electrical Switchgear">Electrical Switchgear</option>
                    <option value="Emergency Generator">Emergency Generator</option>
                    <option value="Material Conveyor">Material Conveyor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Location in Site</label>
                  <input
                    type="text"
                    placeholder="e.g. Roof Deck Area B"
                    value={assetForm.locationInSite}
                    onChange={(e) => setAssetForm({ ...assetForm, locationInSite: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
