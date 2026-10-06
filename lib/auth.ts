import 'server-only';
import { createClient } from './supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from './types';

export async function getIdentity() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, user: null, profile: null };
  const { data } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { db, user, profile: data as Profile | null };
}
export async function requireAdminPage() {
  const identity = await getIdentity();
  if (!identity.user || identity.profile?.role !== 'admin') redirect('/admin/login');
  return identity;
}
