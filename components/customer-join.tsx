'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Smartphone, Utensils, Gift, Check, Heart } from 'lucide-react';
import { Brand, Stamps, RewardVisual } from './brand';
import { Notice, Busy } from './shared';
import { api } from '@/lib/api-client';
import { joinSchema } from '@/lib/validation';
import { createClient } from '@/lib/supabase/client';
import type { Reward, Shop } from '@/lib/types';

export function CustomerEntry({ shop, reward }: { shop: Shop; reward: Reward }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const parsed = joinSchema.safeParse({ name, phone });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        // Establish ownership without asking for an OTP, password or email.
        // Calling Auth from the browser preserves Supabase's per-visitor rate limits.
        const { error: sessionError } = await db.auth.signInAnonymously();
        if (sessionError) throw new Error(sessionError.status === 429
          ? 'Too many attempts. Please wait a little and try again.'
          : 'We couldn’t open your card. Please try again.');
      }
      await api('auth/join', { method: 'POST', body: JSON.stringify(parsed.data) });
      router.replace('/loyalty/profile');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 border-b border-line/80 px-5 sm:h-24 sm:px-10 lg:px-16">
        <Brand name={shop.name}/>
        <Link href="/admin/login" className="inline-flex items-center gap-2 text-xs font-medium text-forest hover:underline sm:text-[13px]">Shopkeeper sign in <ArrowRight size={15}/></Link>
      </header>

      <main className="mx-auto grid max-w-7xl items-center gap-7 px-5 py-7 sm:gap-14 sm:px-10 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:px-16 lg:py-20">
        <section className="relative min-w-0">
          <div className="flex items-center gap-2.5 text-[9px] font-semibold tracking-[0.18em] text-forest sm:text-[10px]"><span className="size-1.5 rounded-full bg-forest"/> A LITTLE THANK YOU, EVERY SIX VISITS</div>
          <h1 className="relative mt-5 text-[44px] font-medium leading-[1.04] tracking-[-0.055em] text-forest sm:mt-6 sm:text-[clamp(3.7rem,6vw,5.7rem)]">Good food.<br/>Even better<br/><em className="font-serif font-normal text-[#778c6c]">rewards.</em><span className="ml-5 inline-block align-top text-[0.75em] font-normal text-[#d4a77e]">✳</span></h1>
          <p className="mt-5 text-[13px] leading-6 text-muted sm:mt-7 sm:text-[15px] sm:leading-7">Your usual order. Your favourite spot.<br/>Now with a little something on the house.</p>
          <div className="relative mt-9 hidden max-w-[440px] -rotate-2 rounded-2xl border border-[#d9e1d2] bg-[#e9eedf] px-7 pb-5 pt-5 shadow-[5px_8px_0_#dce3d340] sm:block">
            <div className="flex items-center justify-between text-forest"><span className="text-2xl font-semibold">{shop.name.toLowerCase()}. <small className="ml-3 text-[8px] font-medium tracking-wider">THE REGULARS CLUB</small></span><Heart size={19}/></div>
            <Stamps count={3}/>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-forest/10 pt-3 text-[9px] text-forest/65"><span>A little closer to something delicious.</span><span className="font-mono">3 / 6</span></div>
            <span className="absolute -bottom-5 left-0 w-full text-center text-[9px] italic text-muted">A taste of your digital card</span>
          </div>
          <div className="mt-12 hidden flex-wrap gap-x-5 gap-y-3 text-[10px] text-muted sm:flex">{['Free to join', 'No app to download', 'No OTP needed'].map(text => <span className="flex items-center gap-1" key={text}><Check size={15} className="text-forest"/>{text}</span>)}</div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_12px_60px_-25px_#1c3d2a20]">
          <div className="relative hidden h-52 overflow-hidden bg-[#e9ecdf] sm:block [&>.dish-art]:h-full [&>.reward-image]:!h-full">
            <RewardVisual image={reward.image_url} name={reward.name}/>
            <span className="absolute right-5 top-6 flex size-[87px] rotate-12 flex-col items-center justify-center rounded-full border border-dashed border-[#cfaa87] bg-peach text-center text-[9px] tracking-widest text-[#805735] shadow-sm">YOUR 6TH<br/><b className="font-serif text-lg font-normal italic tracking-normal">is on us!</b></span>
          </div>
          <div className="p-6 sm:p-9">
            <span className="block text-[10px] font-semibold leading-5 tracking-[0.17em] text-forest/70">WELCOME TO THE REGULARS CLUB</span>
            <h2 className="mt-2.5 text-[27px] font-medium leading-tight tracking-[-0.8px]">Make yourself a regular.</h2>
            <p className="mb-6 mt-3 text-[13px] leading-6 text-muted">Just your name and number. Your loyalty card is ready in a moment.</p>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Notice message={error}/>
              <label>Your name<input autoComplete="name" placeholder="e.g. Arun" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={60} required disabled={busy}/></label>
              <label>Mobile number<div className="mt-2 flex items-center rounded-xl border border-line bg-white transition focus-within:border-forest focus-within:ring-4 focus-within:ring-forest/5"><span className="shrink-0 border-r border-line px-4 text-sm">+91</span><input className="!mt-0 !border-0 !bg-transparent !ring-0" autoComplete="tel-national" inputMode="tel" type="tel" placeholder="98765 43210" value={phone} maxLength={16} onChange={e => setPhone(e.target.value)} required aria-label="Mobile number" disabled={busy}/></div></label>
              <button className="mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-forest px-5 py-3 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-forest-dark hover:shadow-md active:translate-y-px" disabled={busy}>{busy ? <Busy label="Opening your card"/> : <>Get my loyalty card <ArrowRight size={18}/></>}</button>
              <p className="text-center text-[10px] leading-5 text-muted">No OTP. No password. Just good food.<br/>Come back on this browser to find your saved card.</p>
            </form>
          </div>
        </section>
      </main>

      <section className="border-t border-line bg-[#f1f3ec] px-5 py-14 text-center sm:px-10 sm:py-16">
        <span className="text-[10px] font-semibold tracking-[0.17em] text-forest/70">GOOD THINGS COME TO REGULARS</span>
        <h2 className="mt-2 text-[27px] font-medium tracking-[-0.6px]">A few visits. A lovely little reward.</h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-10 sm:grid-cols-3 sm:gap-16">
          {[{ icon: Smartphone, title: '01. Join the club', text: 'Enter your name and mobile number. Your digital card is ready.' }, { icon: Utensils, title: '02. Enjoy & collect', text: 'After your purchase, enter the shop’s code to collect a stamp.' }, { icon: Gift, title: '03. Your sixth is special', text: 'Collect six stamps. Enjoy your reward. Start again.' }].map(item => <div key={item.title}><item.icon className="mx-auto mb-5 size-7 text-forest"/><h3 className="text-sm font-semibold">{item.title}</h3><p className="mx-auto mt-2 max-w-[240px] text-xs leading-6 text-muted">{item.text}</p></div>)}
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-8 text-[11px] text-muted sm:px-10 lg:px-16"><Brand name={shop.name}/><span>For the love of coming back.</span><span className="flex items-center gap-2">Made for our regulars <Heart size={13}/></span></footer>
    </div>
  );
}
