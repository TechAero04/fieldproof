'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, Layers, CheckSquare, Search, ArrowRight, Shield } from 'lucide-react';

export default function TemplatesListPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filtered = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inspection Templates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standard operating checklists, OSHA frameworks, and regulatory audit criteria.
          </p>
        </div>

        <Link
          href="/manager/templates/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Template</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates by title or category..."
          className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
        />
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading templates...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-slate-200 bg-white">
          <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No templates found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create a custom checklist template to start scheduling standardized field audits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tpl) => {
            const totalQuestions = tpl.sections?.reduce(
              (acc: number, s: any) => acc + (s.questions?.length || 0),
              0
            );

            return (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                      {tpl.category}
                    </span>
                    <span className="text-[11px] text-slate-400">v{tpl.version}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1">{tpl.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {tpl.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      {tpl.sections?.length || 0} sections
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
                      {totalQuestions} questions
                    </span>
                  </div>

                  <Link
                    href={`/manager/inspections/new?templateId=${tpl.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Use in Inspection
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
