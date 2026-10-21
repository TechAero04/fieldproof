import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.organizationRole || user.role;

  if (role === 'MANAGER' || role === 'ORG_ADMIN' || role === 'SUPER_ADMIN') {
    redirect('/manager/dashboard');
  } else {
    redirect('/inspector/dashboard');
  }
}
