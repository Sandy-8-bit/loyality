import { CustomerCard } from '@/components/customer-card';
import { getIdentity } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function ProfilePage() {
  const { user, profile } = await getIdentity();
  if (!user || !profile) redirect('/loyalty');
  if (profile?.role === 'admin') redirect('/admin/dashboard');
  return <CustomerCard/>;
}
