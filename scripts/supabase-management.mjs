import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
export const projectUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
export const projectRef=new URL(projectUrl).hostname.split('.')[0];
export async function management(path,body,method){
  const token=process.env.SUPABASE_ACCESS_TOKEN||process.env.ACCESS_TOKEN;
  if(!token)throw new Error('Set SUPABASE_ACCESS_TOKEN or ACCESS_TOKEN in .env.local.');
  const response=await fetch(`https://api.supabase.com/v1/projects/${projectRef}/${path}`,{method:method||(body?'POST':'GET'),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok){const message=await response.text();throw new Error(`Supabase ${path}: HTTP ${response.status}: ${message.slice(0,500)}`);}
  return response.json();
}
export const query=(sql)=>management('database/query',{query:sql});
