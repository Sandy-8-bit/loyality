import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { management,query,projectUrl } from './supabase-management.mjs';
const email=process.env.ADMIN_EMAIL||process.argv[2];
if(!email||!/^\S+@\S+\.\S+$/.test(email))throw new Error('Usage: npm run setup:owner -- owner@example.com');
const existing=await query(`select id from auth.users where lower(email)=lower('${email.replaceAll("'","''")}')`);
let id=existing[0]?.id;
let password;
if(!id){
  const keys=await management('api-keys');
  const service=keys.find(k=>k.name==='service_role')?.api_key;
  if(!service)throw new Error('The management token cannot access the service key needed to create the admin.');
  const db=createClient(projectUrl,service,{auth:{autoRefreshToken:false,persistSession:false}});
  password=randomBytes(24).toString('base64url');
  const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});
  if(error)throw new Error(error.message);id=data.user.id;
}
await query(`insert into public.profiles(id,role,name) values('${id}','admin','Shop owner') on conflict(id) do update set role='admin'`);
if(password){writeFileSync('.admin-credentials.local',`Kora admin sign-in\nURL: http://localhost:3000/admin/login\nEmail: ${email}\nPassword: ${password}\n\nChange this password in Settings after signing in. Keep this file private.\n`,{flag:'wx'});console.log('Admin created. Initial password saved privately to .admin-credentials.local.');}
else console.log('Existing account granted admin access. Its password was not changed.');
