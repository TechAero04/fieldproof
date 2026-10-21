'use client';

import React from 'react';
import { getStatusDetails } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const details = getStatusDetails(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${
        details.bg
      } ${size === 'sm' ? 'text-xs' : 'text-xs md:text-sm'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${details.dot}`} />
      {details.label}
    </span>
  );
}
