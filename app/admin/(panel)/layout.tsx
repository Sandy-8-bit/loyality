import { requireAdminPage } from '@/lib/auth';
import { getPublicData } from '@/lib/public-data';
import { AdminShell } from '@/components/admin-shell';
export default async function AdminLayout({children}:{children:React.ReactNode}){const [{user},{shop}]=await Promise.all([requireAdminPage(),getPublicData()]);return <AdminShell shopName={shop.name} email={user!.email||'Administrator'}>{children}</AdminShell>;}
