'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { formatDate } from '@/lib/utils';
import {
  PlusCircle,
  Search,
  Filter,
  Eye,
  Download,
  AlertCircle,
  FileText,
  Calendar,
  Building,
} from 'lucide-react';

export default function AllInspectionsPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/inspections?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setInspections(data.inspections || []);
      }
    } catch (e) {
      console.error('Error fetching inspections:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInspections();
  };

  const statusTabs = [
    { label: 'All', value: 'ALL' },
    { label: 'Needs Review', value: 'SUBMITTED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Revisions', value: 'CHANGES_REQUESTED' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            All Field Inspections
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, filter, assign, and audit compliance across your enterprise network.
          </p>
        </div>

        <Link
          href="/manager/inspections/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Inspection</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          {statusTabs.map((tab) => (
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

        {/* Search & Priority Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by facility name, address, or inspection title..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </form>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading inspections...
          </div>
        ) : inspections.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No inspections found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your filter criteria or create a new inspection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Facility / Site</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Assigned Inspector</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{insp.siteName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs pl-5">
                        {insp.title}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={insp.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={insp.priority} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {insp.template?.title || 'Standard Template'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {insp.inspector?.name || (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {formatDate(insp.dueDate)}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/manager/inspections/${insp.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-3 w-3 text-slate-500" />
                        {insp.status === 'SUBMITTED' ? 'Review' : 'View'}
                      </Link>

                      {insp.status === 'APPROVED' && (
                        <a
                          href={`/api/inspections/${insp.id}/pdf`}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Download Certified PDF Report"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
