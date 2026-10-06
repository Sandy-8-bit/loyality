import { CustomerEntry } from '@/components/customer-join';
import { getPublicData } from '@/lib/public-data';
import { getIdentity } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function LoyaltyPage() {
  const [{ shop, reward }, { user, profile }] = await Promise.all([getPublicData(), getIdentity()]);
  if (user && profile?.role === 'customer') redirect('/loyalty/profile');
  return <CustomerEntry shop={shop} reward={reward}/>;
}
