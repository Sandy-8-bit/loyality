import { notFound } from 'next/navigation';
import { AdminWorkspace } from '@/components/admin-workspace';
export default async function AdminSection({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!['dashboard','customers','codes','reward','settings','qr'].includes(section))notFound();return <AdminWorkspace section={section} key={section}/>;}
