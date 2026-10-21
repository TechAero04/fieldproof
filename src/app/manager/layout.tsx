import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.organizationRole || (user as any).role;
  const isManagement = user.isSuperAdmin || ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'AUDITOR'].includes(role || '');
  if (!isManagement) {
    redirect('/inspector/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <div className="flex flex-1">
        <Sidebar role="MANAGER" />
        <main className="flex-1 overflow-x-hidden p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
