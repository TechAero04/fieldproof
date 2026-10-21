'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Clock,
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit-logs?limit=100');
      const data = await res.json();
      if (data.auditLogs) setLogs(data.auditLogs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (entityFilter !== 'ALL' && log.entity !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.user?.name && log.user.name.toLowerCase().includes(q)) ||
        log.entity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Entity', 'Details', 'User Name', 'User Email', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.action,
      l.entity,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.user?.name || 'System',
      l.user?.email || 'N/A',
      l.ipAddress || '127.0.0.1',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FieldProof_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tamper-Evident Audit Trail
          </h1>
          <p className="text-sm text-slate-500">
            Immutable log of all user activities, compliance transitions, template edits, and system events.
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <Download className="h-4 w-4" />
          Export Audit CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Entities</option>
            <option value="Inspection">Inspections</option>
            <option value="CorrectiveAction">CAPA Actions</option>
            <option value="Finding">Findings</option>
            <option value="InspectionTemplate">Templates</option>
            <option value="User">User / Auth</option>
            <option value="OfflineSyncOperation">Offline Sync</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading audit records...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-xs text-slate-400">
          No audit records found matching criteria.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Actor / User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        log.action.includes('SUBMITTED') || log.action.includes('APPROVED')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log.action.includes('CREATED')
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : log.action.includes('LOGIN')
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {log.entity}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-md truncate">
                    {log.details || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                    <div className="font-medium">{log.user?.name || 'System / Auto'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{log.user?.email || 'system'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
