'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  PlusCircle,
  FileText,
  Users,
  BarChart3,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Building,
  AlertTriangle,
  History,
} from 'lucide-react';

interface SidebarProps {
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'MANAGER' | 'INSPECTOR' | 'ASSIGNEE' | 'AUDITOR' | string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const isManagement = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'AUDITOR'].includes(role);

  const managerLinks = [
    {
      name: 'Dashboard',
      href: '/manager/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'All Inspections',
      href: '/manager/inspections',
      icon: ClipboardCheck,
    },
    {
      name: 'Create Inspection',
      href: '/manager/inspections/new',
      icon: PlusCircle,
    },
    {
      name: 'Sites & Assets',
      href: '/manager/assets',
      icon: Building,
    },
    {
      name: 'CAPA Actions',
      href: '/manager/capa',
      icon: AlertTriangle,
    },
    {
      name: 'Inspection Templates',
      href: '/manager/templates',
      icon: FileText,
    },
    {
      name: 'Team & Inspectors',
      href: '/manager/inspectors',
      icon: Users,
    },
    {
      name: 'Audit Trail',
      href: '/manager/audit-logs',
      icon: History,
    },
    {
      name: 'Reports & Analytics',
      href: '/manager/reports',
      icon: BarChart3,
    },
  ];

  const fieldLinks = [
    {
      name: 'Dashboard',
      href: '/inspector/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'My Inspections',
      href: '/inspector/inspections',
      icon: ClipboardList,
    },
    {
      name: 'Profile & Credentials',
      href: '/inspector/profile',
      icon: UserCheck,
    },
  ];

  const links = isManagement ? managerLinks : fieldLinks;

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isManagement ? 'Management & Compliance' : 'Field Operations'}
          </div>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (pathname.startsWith(`${link.href}/`) && link.href !== '/manager/inspections');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{link.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-500" />}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Safety Compliance Badge Box */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900">
        <div className="flex items-center gap-1.5 font-semibold mb-1">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <span>V2 Regulatory Engine</span>
        </div>
        <p className="text-[11px] text-blue-700 leading-relaxed">
          Tamper-evident audit trail, automated geofence verification, and offline IndexedDB sync.
        </p>
      </div>
    </aside>
  );
}
