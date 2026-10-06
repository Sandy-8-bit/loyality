import { randomInt, randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { codeSchema, joinSchema, loginSchema, nameSchema, rewardSchema, shopSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';
type DB = Awaited<ReturnType<typeof createClient>>;
class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }
function check(error: { message: string } | null) { if (error) throw new ApiError('We couldn’t complete that request. Please try again.', 500); }
async function rpc(db: DB, name: string, args?: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args);
  check(error);
  if (data?.error) throw new ApiError(data.error, data.rateLimited ? 429 : 400);
  return data;
}
async function publicInfo(db: DB) {
  const [shop, reward] = await Promise.all([db.from('shop_settings').select('*').eq('id', 1).single(), db.from('rewards').select('*').eq('id', 1).single()]);
  check(shop.error); check(reward.error);
  return { shop: shop.data, reward: reward.data };
}
async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const path = (await context.params).path.join('/');
    const method = request.method;
    if (method !== 'GET') {
      const origin = request.headers.get('origin');
      if (origin && origin !== request.nextUrl.origin && origin !== process.env.APP_URL) throw new ApiError('Request origin is not allowed.', 403);
      if (Number(request.headers.get('content-length') || 0) > 5_500_000) throw new ApiError('The image must be under 5 MB.', 413);
    }
    const db = await createClient();
    const json = async () => { try { return await request.json(); } catch { throw new ApiError('Invalid request.'); } };
    let result: unknown;
    if (path === 'public' && method === 'GET') result = await publicInfo(db);
    else if (path === 'auth/join' && method === 'POST') {
      const { name, phone } = joinSchema.parse(await json());
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new ApiError('Please try joining again.', 401);
      result = await rpc(db, 'register_customer', { p_name: name, p_phone: phone });
    } else if (path === 'auth/send-otp' || path === 'auth/verify-otp') {
      throw new ApiError('OTP sign-in has been removed. Join using your name and mobile number.', 410);
    } else if (path === 'auth/login' && method === 'POST') {
      const values = loginSchema.parse(await json());
      const { data, error } = await db.auth.signInWithPassword(values);
      if (error || !data.user) throw new ApiError('The email or password is incorrect.', 401);
      const { data: profile } = await db.from('profiles').select('role').eq('id', data.user.id).single();
      if (profile?.role !== 'admin') { await db.auth.signOut(); throw new ApiError('This account does not have shopkeeper access.', 403); }
      result = { success: true };
    } else if (path === 'auth/logout' && method === 'POST') {
      const { error } = await db.auth.signOut(); check(error); result = { success: true };
    } else {
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new ApiError('Please sign in to continue.', 401);
      const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (path.startsWith('admin/') && profile?.role !== 'admin') throw new ApiError('Shopkeeper access is required.', 403);
      if (path.startsWith('customer/') && profile?.role !== 'customer') throw new ApiError('Enter your name and mobile number to open your card.', 403);

      if (path === 'customer/profile' && method === 'PUT') {
        result = await rpc(db, 'ensure_customer', { p_name: nameSchema.parse(await json()).name });
      } else if ((path === 'customer/loyalty' || path === 'customer/profile') && method === 'GET') {
        const customer = await rpc(db, 'ensure_customer', { p_name: null });
        const [cycles, checkins, info] = await Promise.all([
          db.from('loyalty_cycles').select('*').eq('customer_id', user.id).order('cycle_number', { ascending: false }).limit(100),
          db.from('loyalty_checkins').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(100), publicInfo(db),
        ]);
        check(cycles.error); check(checkins.error);
        result = { profile: customer, cycles: cycles.data, checkins: checkins.data, ...info };
      } else if (path === 'customer/loyalty/validate-code' && method === 'POST') {
        result = await rpc(db, 'validate_loyalty_code', { p_code: codeSchema.parse(await json()).code });
      } else if (path === 'admin/overview' && method === 'GET') {
        result = await rpc(db, 'admin_overview');
      } else if (path === 'admin/customers' && method === 'GET') {
        const search = (request.nextUrl.searchParams.get('search') || '').replace(/[^\p{L}\p{N}\s+]/gu, '').slice(0, 60);
        const page = Math.max(1, Math.min(100000, Number(request.nextUrl.searchParams.get('page')) || 1));
        let query = db.from('profiles').select('*,loyalty_cycles!loyalty_cycles_customer_id_fkey(*)', { count: 'exact' }).eq('role', 'customer').order('created_at', { ascending: false });
        if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
        const { data, error, count } = await query.range((page - 1) * 20, page * 20 - 1);
        check(error); result = { customers: data, total: count, page };
      } else if (/^admin\/customers\/[\w-]+$/.test(path) && method === 'GET') {
        const id = z.uuid().parse(path.split('/')[2]);
        const [customer, cycles, checkins] = await Promise.all([
          db.from('profiles').select('*').eq('id', id).eq('role', 'customer').single(),
          db.from('loyalty_cycles').select('*').eq('customer_id', id).order('cycle_number', { ascending: false }).limit(100),
          db.from('loyalty_checkins').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(100),
        ]);
        if (!customer.data) throw new ApiError('Customer not found.', 404);
        check(cycles.error); check(checkins.error);
        result = { profile: customer.data, cycles: cycles.data, checkins: checkins.data };
      } else if (path === 'admin/codes' && method === 'GET') {
        const { data, error } = await db.from('loyalty_codes').select('*').order('created_at', { ascending: false }).limit(100);
        check(error); result = data;
      } else if (path === 'admin/codes' && method === 'POST') {
        const code = String(randomInt(0, 10000)).padStart(4, '0') + String.fromCharCode(65 + randomInt(26), 65 + randomInt(26));
        result = await rpc(db, 'generate_loyalty_code', { p_code: code });
      } else if (path === 'admin/claim' && method === 'POST') {
        const { cycleId } = z.object({ cycleId: z.uuid() }).parse(await json());
        result = await rpc(db, 'claim_reward', { p_cycle_id: cycleId });
      } else if (path === 'admin/reward' && method === 'PUT') {
        const values = rewardSchema.parse(await json());
        if (values.image_url && !values.image_url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/loyalty-rewards/`)) throw new ApiError('Please upload the reward image first.');
        const { data, error } = await db.from('rewards').update({ ...values, updated_at: new Date().toISOString(), updated_by: user.id }).eq('id', 1).select().single();
        check(error); result = data;
      } else if (path === 'admin/reward/image' && method === 'POST') {
        const form = await request.formData();
        const file = form.get('image');
        if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5_000_000 || file.size === 0) throw new ApiError('Upload a JPG, PNG or WebP image under 5 MB.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        const valid = file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.type === 'image/png' ? Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10])) : Buffer.from(bytes.slice(0, 4)).toString() === 'RIFF' && Buffer.from(bytes.slice(8,12)).toString() === 'WEBP';
        if (!valid) throw new ApiError('That file does not appear to be a supported image.');
        const key = `${randomUUID()}.${file.type.split('/')[1]}`;
        const { error } = await db.storage.from('loyalty-rewards').upload(key, bytes, { contentType: file.type, upsert: false });
        check(error);
        result = { image_url: db.storage.from('loyalty-rewards').getPublicUrl(key).data.publicUrl };
      } else if (path === 'admin/settings' && method === 'PUT') {
        const values = shopSchema.parse(await json());
        const { data, error } = await db.from('shop_settings').update(values).eq('id', 1).select().single();
        check(error); result = data;
      } else if (path === 'admin/password' && method === 'PUT') {
        const { currentPassword, password } = z.object({ currentPassword: z.string().min(1), password: z.string().min(12, 'Use at least 12 characters.').max(128) }).parse(await json());
        const verified = await db.auth.signInWithPassword({ email: user.email!, password: currentPassword });
        if (verified.error) throw new ApiError('Your current password is incorrect.');
        const { error } = await db.auth.updateUser({ password }); check(error); result = { success: true };
      } else throw new ApiError('Not found.', 404);
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : 'Something went wrong.';
    return NextResponse.json({ error: message }, { status: error instanceof ApiError ? error.status : error instanceof z.ZodError || /mobile number/.test(message) ? 400 : 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
export { handler as GET, handler as POST, handler as PUT };
