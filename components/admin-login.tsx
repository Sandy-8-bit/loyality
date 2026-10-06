'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, Eye, EyeOff, Heart } from 'lucide-react';
import { Brand, Stamps } from './brand';
import { api } from '@/lib/api-client';
import { Busy, Notice } from './shared';
export function AdminLogin({ shopName }: {
    shopName: string;
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try {
        await api('auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        router.replace('/admin/dashboard');
        router.refresh();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <main className="login-page grid min-h-screen lg:grid-cols-[1fr_1fr]"><section className="login-story relative hidden min-h-screen flex-col justify-between overflow-hidden bg-forest p-12 text-cream lg:flex xl:p-16 [&_.eyebrow]:text-cream/60 [&_h1]:mt-7 [&_h1]:text-[clamp(2.6rem,4.4vw,4rem)] [&_h1]:font-medium [&_h1]:leading-[1.13] [&_h1]:tracking-[-2px] [&_h1_em]:font-serif [&_h1_em]:font-normal [&_h1_em]:text-[#c1d0af] [&>div>p]:mt-6 [&>div>p]:text-sm [&>div>p]:leading-7 [&>div>p]:text-cream/60"><Brand name={shopName} light/><div><span className="eyebrow flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.18em] text-forest [&>span]:size-1.5 [&>span]:rounded-full [&>span]:bg-forest">A LITTLE LOYALTY GOES A LONG WAY</span><h1>Turn familiar faces<br />into <em>regulars.</em></h1><p>More reasons to come back.<br />More moments worth sharing.</p><div className="login-card mt-14 max-w-[420px] -rotate-3 rounded-2xl border border-cream/15 bg-[#335e49] p-7 shadow-xl [&_.section-heading]:text-[9px] [&_.section-heading]:tracking-widest [&_.stamp>span]:border-cream/25 [&_.stamp>span]:text-cream/40 [&_.stamp>small]:text-cream/60 [&_.stamp-done>span]:!border-[#dbe4c5] [&_.stamp-done>span]:!bg-[#dbe4c5] [&_.stamp-done>span]:!text-forest [&>p]:border-t [&>p]:border-white/10 [&>p]:pt-4 [&>p]:text-[9px] [&>p]:text-cream/60"><div className="section-heading flex items-center justify-between gap-4 [&_h3]:text-[15px] [&_h3]:font-semibold [&_p]:mt-1.5 [&_p]:text-xs [&_p]:font-normal [&_p]:leading-5 [&_p]:text-muted"><span>THE REGULARS CLUB</span><Heart size={20}/></div><Stamps count={5}/><p>Good food. Great company. One lovely reward.</p></div></div><span className="login-story-footer mt-12 text-xs text-cream/50">A little thank you, every six visits.</span></section><section className="login-form-side flex min-h-screen flex-col justify-between gap-10 px-6 py-8 sm:px-16 sm:py-12 [&>a]:self-start"><Link href="/loyalty" className="text-link inline-flex items-center justify-center gap-2 text-[13px] font-medium text-forest hover:text-forest-dark hover:underline underline-offset-4"><ArrowLeft size={16}/> Back to the regulars club</Link><div className="login-form mx-auto w-full max-w-[380px] [&>.mini-label]:mt-7 [&>h2]:mt-2 [&>h2]:text-4xl [&>h2]:font-medium [&>h2]:tracking-tight [&>p]:mb-8 [&>p]:mt-3 [&>p]:text-sm [&>p]:leading-6 [&>p]:text-muted [&>.privacy-note]:mt-6"><span className="soft-icon inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-sage text-forest"><ShieldCheck size={25}/></span><span className="mini-label block text-[10px] font-semibold leading-5 tracking-[0.17em] text-forest/70">THE SHOPKEEPER’S CORNER</span><h2>Welcome back.</h2><p>Let’s make someone’s next visit a little more special.</p><form onSubmit={submit} className="form-stack flex flex-col gap-5"><Notice message={error}/><label>Email address<input type="email" autoComplete="username" placeholder="you@yourshop.com" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>Password<div className="password-input relative [&>input]:pr-12 [&>button]:absolute [&>button]:right-2 [&>button]:top-4"><input type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" required value={password} onChange={e => setPassword(e.target.value)}/><button className="icon-button inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sage hover:text-forest" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label><button className="button inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-[13px] font-medium leading-5 transition-all active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 button-primary bg-forest text-white shadow-sm hover:bg-forest-dark hover:shadow-md button-full w-full" disabled={busy}>{busy ? <Busy label="Signing in"/> : <>Sign in to dashboard <ArrowRight size={18}/></>}</button></form><div className="privacy-note flex items-start justify-center gap-2 text-center text-[10px] font-normal leading-5 text-muted [&>svg]:mt-1 [&>svg]:shrink-0"><ShieldCheck size={15}/> Secure access for the {shopName} team.</div></div><span className="login-form-footer text-center text-[11px] text-muted">For the love of coming back.</span></section></main>;
}
