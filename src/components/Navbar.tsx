'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, Bell, Building2, CheckCircle2, ChevronDown } from 'lucide-react';
import { TokenPayload } from '@/lib/auth';

interface NavbarProps {
  user: TokenPayload | any | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const activeRole = user?.organizationRole || user?.role || 'INSPECTOR';

  useEffect(() => {
    if (!user) return;

    // Fetch user organizations for tenant switching
    fetch('/api/organizations')
      .then((res) => res.json())
      .then((data) => {
        if (data.organizations) setOrganizations(data.organizations);
      })
      .catch((e) => console.error('Failed to fetch orgs:', e));

    // Fetch notifications
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch((e) => console.error('Failed to fetch notifications:', e));
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleSwitchOrg = async (orgId: string) => {
    try {
      const res = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      });
      if (res.ok) {
        setShowOrgDropdown(false);
        window.location.reload();
      }
    } catch (e) {
      console.error('Org switch error:', e);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setUnreadCount(0);
    } catch (e) {
      console.error('Mark read error:', e);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  FieldProof
                </span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-700 border border-blue-200">
                  V2 Multi-Tenant
                </span>
              </div>
            </div>
          </Link>

          {/* Tenant Switcher */}
          {user && organizations.length > 0 && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span className="max-w-[140px] truncate">
                  {user.organizationName || 'Select Tenant'}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showOrgDropdown && (
                <div className="absolute left-0 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-50">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Switch Active Organization
                  </div>
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 ${
                        org.id === user.organizationId ? 'font-semibold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <div className="truncate">
                        <div>{org.name}</div>
                        <div className="text-[10px] text-slate-400">{org.industry || 'Compliance'}</div>
                      </div>
                      {org.id === user.organizationId && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info, Notifications & Sign Out */}
        {user && (
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && unreadCount > 0) {
                    handleMarkNotificationsRead();
                  }
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 px-2 py-1.5 pb-2">
                    <span className="text-xs font-semibold text-slate-900">Notifications</span>
                    <span className="text-[10px] text-slate-400">Real-time alerts</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 py-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">No recent notifications</div>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <div key={n.id} className="p-2 hover:bg-slate-50 text-xs">
                          <div className="font-medium text-slate-800">{n.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                          <div className="text-[9px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleTimeString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-3 pl-1 sm:pl-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-900">{user.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {activeRole.replace('_', ' ')}
                </div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs">
                {user.name.charAt(0)}
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
