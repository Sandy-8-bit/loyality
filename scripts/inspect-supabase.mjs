import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
async function request(path, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Management API ${path}: HTTP ${response.status}`);
  return response.json();
}
const [config, tables] = await Promise.all([
  request('config/auth'),
  request('database/query', { query: "select tablename from pg_tables where schemaname = 'public' order by tablename" }),
]);
console.log(JSON.stringify({
  phoneEnabled: config.external_phone_enabled,
  customerSessionsEnabled: config.external_anonymous_users_enabled,
  smsProvider: config.sms_provider,
  smsCredentialsPresent: Object.fromEntries(Object.entries(config)
    .filter(([key]) => /^sms_.*(sid|token|key|password)$/.test(key))
    .map(([key, value]) => [key, Boolean(value)])),
  smsHookEnabled: Boolean(config.hook_send_sms_enabled),
  providersPage: `https://supabase.com/dashboard/project/${ref}/auth/providers`,
  smsOtpLength: config.sms_otp_length,
  smsCooldown: config.sms_max_frequency,
  smsRateLimit: config.rate_limit_sms_sent,
  emailEnabled: config.external_email_enabled,
  tables,
}, null, 2));
