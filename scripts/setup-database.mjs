import { readFileSync,readdirSync } from 'node:fs';
import { query,management } from './supabase-management.mjs';
await query('create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text);');
for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()){
  const version=file.split('_')[0];
  const applied=await query(`select version from supabase_migrations.schema_migrations where version='${version}'`);
  if(applied.length){console.log(`${file}: already applied`);continue;}
  const sql=readFileSync(`supabase/migrations/${file}`,'utf8');
  await query(`begin;\n${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${file.slice(version.length+1,-4)}',array['${sql.replaceAll("'","''")}']);\ncommit;`);
  console.log(`${file}: applied`);
}
// Customer sessions require no password, email or SMS; existing admin login remains enabled.
await management('config/auth',{external_anonymous_users_enabled:true},'PATCH');
const config=await management('config/auth');
if(!config.external_anonymous_users_enabled)throw new Error('Could not enable customer sessions.');
console.log('Customer sessions enabled. No OTP or SMS provider required.');
const tables=await query("select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename");
console.log(JSON.stringify({tables},null,2));
