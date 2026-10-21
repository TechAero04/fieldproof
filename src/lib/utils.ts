import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getStatusDetails(status: string) {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Approved',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'SUBMITTED':
      return {
        label: 'Under Review',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'CHANGES_REQUESTED':
      return {
        label: 'Changes Requested',
        bg: 'bg-orange-50 text-orange-700 border-orange-200',
        dot: 'bg-orange-500',
      };
    case 'ASSIGNED':
      return {
        label: 'Assigned',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'DRAFT':
    default:
      return {
        label: 'Draft',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
      };
  }
}

export function getPriorityDetails(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return {
        label: 'Critical',
        bg: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
      };
    case 'HIGH':
      return {
        label: 'High',
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    case 'MEDIUM':
      return {
        label: 'Medium',
        bg: 'bg-sky-100 text-sky-800 border-sky-300',
      };
    case 'LOW':
    default:
      return {
        label: 'Low',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}
