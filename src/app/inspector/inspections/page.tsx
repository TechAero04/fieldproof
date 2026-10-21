'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { formatDate } from '@/lib/utils';
import {
  ClipboardList,
  Search,
  PlayCircle,
  Eye,
  Download,
  Building,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export default function MyInspectionsPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inspections');
      const data = await res.json();
      if (res.ok) {
        setInspections(data.inspections || []);
      }
    } catch (e) {
      console.error('Error fetching my inspections:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const filterTabs = [
    { label: 'All Audits', value: 'ALL' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'In Progress (Drafts)', value: 'IN_PROGRESS' },
    { label: 'Under Review', value: 'SUBMITTED' },
    { label: 'Needs Revision', value: 'CHANGES_REQUESTED' },
    { label: 'Approved', value: 'APPROVED' },
  ];

  const filtered = inspections.filter((i) => {
    const matchesFilter = statusFilter === 'ALL' || i.status === statusFilter;
    const matchesSearch =
      i.siteName.toLowerCase().includes(search.toLowerCase()) ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.siteAddress.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Assigned Field Audits
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete checklists, capture geolocation coordinates, attach photographic evidence, and submit for certification.
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assigned audits by facility or title..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* List / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading your inspections...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-slate-200 bg-white">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No inspections match</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try switching filter tabs or check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <StatusBadge status={item.status} size="sm" />
                  <PriorityBadge priority={item.priority} />
                </div>

                <h3 className="font-bold text-slate-900 text-base">{item.siteName}</h3>
                <p className="text-xs text-slate-600 mt-1">{item.title}</p>

                <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.siteAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Due: {formatDate(item.dueDate)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {item.template?.title}
                </span>

                <div className="flex items-center gap-2">
                  {['ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED'].includes(item.status) ? (
                    <Link
                      href={`/inspector/inspections/${item.id}/conduct`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      <span>
                        {item.status === 'IN_PROGRESS'
                          ? 'Resume'
                          : item.status === 'CHANGES_REQUESTED'
                          ? 'Revise'
                          : 'Conduct'}
                      </span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/inspector/inspections/${item.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      {item.status === 'APPROVED' && (
                        <a
                          href={`/api/inspections/${item.id}/pdf`}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
