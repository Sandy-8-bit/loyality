import { spawnSync } from 'node:child_process';
import { projectRef } from './supabase-management.mjs';
const result=spawnSync('npx.cmd',['--yes','supabase','db','advisors','--linked','--project-ref',projectRef,'--type','security','--level','warn'],{shell:true,stdio:'inherit',env:{...process.env,SUPABASE_ACCESS_TOKEN:process.env.SUPABASE_ACCESS_TOKEN||process.env.ACCESS_TOKEN}});
process.exitCode=result.status??1;
