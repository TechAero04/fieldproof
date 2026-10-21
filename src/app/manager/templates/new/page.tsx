'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Layers,
  HelpCircle,
  Camera,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface QuestionDraft {
  questionText: string;
  questionType: string;
  isRequired: boolean;
  requirePhoto: boolean;
  helpText: string;
}

interface SectionDraft {
  title: string;
  description: string;
  questions: QuestionDraft[];
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Fire & Safety');
  const [sections, setSections] = useState<SectionDraft[]>([
    {
      title: 'Initial Safety Assessment',
      description: 'Physical perimeter and baseline environmental checks.',
      questions: [
        {
          questionText: 'Are all emergency egress paths and doors unobstructed?',
          questionType: 'PASS_FAIL_NA',
          isRequired: true,
          requirePhoto: true,
          helpText: 'Ensure 36-inch continuous clearance.',
        },
      ],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSection = () => {
    setSections([
      ...sections,
      {
        title: `Section ${sections.length + 1}`,
        description: '',
        questions: [
          {
            questionText: '',
            questionType: 'PASS_FAIL_NA',
            isRequired: true,
            requirePhoto: false,
            helpText: '',
          },
        ],
      },
    ]);
  };

  const removeSection = (secIdx: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, idx) => idx !== secIdx));
  };

  const updateSection = (secIdx: number, field: string, val: string) => {
    const updated = [...sections];
    (updated[secIdx] as any)[field] = val;
    setSections(updated);
  };

  const addQuestion = (secIdx: number) => {
    const updated = [...sections];
    updated[secIdx].questions.push({
      questionText: '',
      questionType: 'PASS_FAIL_NA',
      isRequired: true,
      requirePhoto: false,
      helpText: '',
    });
    setSections(updated);
  };

  const removeQuestion = (secIdx: number, qIdx: number) => {
    const updated = [...sections];
    if (updated[secIdx].questions.length <= 1) return;
    updated[secIdx].questions = updated[secIdx].questions.filter((_, idx) => idx !== qIdx);
    setSections(updated);
  };

  const updateQuestion = (secIdx: number, qIdx: number, field: string, val: any) => {
    const updated = [...sections];
    (updated[secIdx].questions[qIdx] as any)[field] = val;
    setSections(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Template title is required');
      return;
    }

    for (const sec of sections) {
      if (!sec.title.trim()) {
        setError('All sections must have a title');
        return;
      }
      for (const q of sec.questions) {
        if (!q.questionText.trim()) {
          setError('All questions must have question text');
          return;
        }
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          sections,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      router.push('/manager/templates');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/manager/templates"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Audit Template
          </h1>
          <p className="text-xs text-slate-500">
            Design sections, configurable question types (Pass/Fail, Ratings, Values), and evidence requirements.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Overview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Template Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Warehouse OSHA & Fire Safety Protocol"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="Fire & Safety">Fire & Safety</option>
                <option value="OSHA Compliance">OSHA Compliance</option>
                <option value="Facility Engineering">Facility Engineering</option>
                <option value="Environmental Health">Environmental Health</option>
                <option value="Quality Assurance">Quality Assurance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Audit Purpose
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline the scope and regulatory baseline for this inspection..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Sections & Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Checklist Sections & Questions
            </h2>
            <button
              type="button"
              onClick={addSection}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 text-blue-600" />
              <span>Add Section</span>
            </button>
          </div>

          {sections.map((sec, secIdx) => (
            <div
              key={secIdx}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {secIdx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      value={sec.title}
                      onChange={(e) => updateSection(secIdx, 'title', e.target.value)}
                      placeholder="Section Title (e.g. Emergency Exits)"
                      className="font-bold text-sm text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none w-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={sec.description}
                    onChange={(e) => updateSection(secIdx, 'description', e.target.value)}
                    placeholder="Brief section instruction or regulatory clause..."
                    className="text-xs text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none w-full"
                  />
                </div>

                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(secIdx)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    title="Remove section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-3 pt-2">
                {sec.questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          value={q.questionText}
                          onChange={(e) =>
                            updateQuestion(secIdx, qIdx, 'questionText', e.target.value)
                          }
                          placeholder={`Question ${qIdx + 1}: e.g. Are fire doors self-closing and unobstructed?`}
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      {sec.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(secIdx, qIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Response Type
                        </label>
                        <select
                          value={q.questionType}
                          onChange={(e) =>
                            updateQuestion(secIdx, qIdx, 'questionType', e.target.value)
                          }
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          <option value="PASS_FAIL_NA">Pass / Fail / N/A</option>
                          <option value="RATING">1 - 5 Star Rating</option>
                          <option value="NUMBER">Numeric Value</option>
                          <option value="TEXT">Freeform Text</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Help Notes / Code
                        </label>
                        <input
                          type="text"
                          value={q.helpText}
                          onChange={(e) =>
                            updateQuestion(secIdx, qIdx, 'helpText', e.target.value)
                          }
                          placeholder="e.g. OSHA 1910.36(g)(2)"
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.requirePhoto}
                            onChange={(e) =>
                              updateQuestion(secIdx, qIdx, 'requirePhoto', e.target.checked)
                            }
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                            <Camera className="h-3 w-3 text-blue-600" />
                            Require Photo
                          </span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) =>
                              updateQuestion(secIdx, qIdx, 'isRequired', e.target.checked)
                            }
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-medium text-slate-700">
                            Required
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addQuestion(secIdx)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Question to Section {secIdx + 1}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <Link
            href="/manager/templates"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving Template...' : 'Save & Publish Template'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
