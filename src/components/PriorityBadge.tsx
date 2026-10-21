'use client';

import React from 'react';
import { getPriorityDetails } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const details = getPriorityDetails(priority);

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${details.bg}`}
    >
      {details.label}
    </span>
  );
}
