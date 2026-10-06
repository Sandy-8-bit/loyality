import { AdminLogin } from '@/components/admin-login';
import { getIdentity } from '@/lib/auth';
import { getPublicData } from '@/lib/public-data';
import { redirect } from 'next/navigation';
export default async function LoginPage(){const [{profile},{shop}]=await Promise.all([getIdentity(),getPublicData()]);if(profile?.role==='admin')redirect('/admin/dashboard');return <AdminLogin shopName={shop.name}/>;}
