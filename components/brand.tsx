import Link from 'next/link';
import { Flower2, Gift, Check, Sparkles } from 'lucide-react';
export function Brand({ name = 'Kora', light = false }: {
    name?: string;
    light?: boolean;
}) {
    return <Link href="/loyalty" className={`brand inline-flex shrink-0 items-center gap-2.5 text-[34px] font-semibold leading-none tracking-[-2px] text-forest no-underline ${light ? "brand-light !text-cream [&_.brand-mark]:!bg-cream/10 [&_.brand-mark]:!text-cream" : ""}`} aria-label={`${name} home`}><span className="brand-mark flex size-9 items-center justify-center rounded-full bg-forest text-cream [&>svg]:size-6"><Flower2 strokeWidth={1.8}/></span><span>{name.toLowerCase()}<span className="brand-dot text-[#c57f56]">.</span></span></Link>;
}
export function Stamps({ count = 0, compact = false }: {
    count?: number;
    compact?: boolean;
}) {
    return <div className={`stamps my-6 grid grid-cols-6 gap-2 sm:gap-3 ${compact ? "stamps-compact !my-4 !gap-2 [&_.stamp>span>svg]:!size-4" : ""}`} aria-label={`${count} of 6 visits completed`}>{Array.from({ length: 6 }, (_, i) => <div key={i} className={`stamp flex min-w-0 flex-col items-center gap-2 [&>span]:flex [&>span]:aspect-square [&>span]:w-full [&>span]:items-center [&>span]:justify-center [&>span]:rounded-full [&>span]:border [&>span]:border-dashed [&>span]:border-forest/25 [&>span]:text-forest/25 [&>span>svg]:size-5 sm:[&>span>svg]:size-6 [&>small]:whitespace-nowrap [&>small]:text-[7px] [&>small]:font-semibold [&>small]:tracking-wider [&>small]:text-forest/60 ${i < count ? "stamp-done [&>span]:!border-solid [&>span]:!border-forest [&>span]:!bg-forest [&>span]:!text-cream" : ""} ${i === 5 ? "stamp-reward [&>span]:!border-[#c6976b] [&>span]:!text-[#b28455]" : ""}`}><span>{i < count ? <Check /> : i === 5 ? <Gift /> : <Flower2 />}</span>{!compact && <small>{i === 5 ? 'ON US' : `VISIT ${String(i + 1).padStart(2, '0')}`}</small>}</div>)}</div>;
}
export function DishArt() {
    return <div className="dish-art relative flex h-56 w-full items-center justify-center overflow-hidden bg-[#eff0e6]" aria-hidden="true"><div className="dish-orbit absolute rounded-full border border-forest/10 orbit-one size-[260px] rotate-[-25deg] scale-x-[1.25]"/><div className="dish-orbit absolute rounded-full border border-forest/10 orbit-two size-[320px] rotate-[-25deg] scale-x-[1.25]"/><div className="dish-plate relative flex size-[172px] -rotate-12 items-center justify-center rounded-full border-[12px] border-[#f8f5e8] bg-[#e5e0cb] shadow-[8px_13px_20px_-5px_#34452730,inset_0_0_0_2px_#ddd8c4]"><div className="dish-food relative size-[123px] overflow-hidden rounded-full border-[5px] border-[#cc9551] shadow-inner"><span /><span /><span /><span /><span /><span /><span /></div><div className="dish-herb absolute size-7 rounded-[80%_10%_80%_10%] bg-[#476c42] shadow-sm herb-one bottom-1 left-3 rotate-[-10deg]"/><div className="dish-herb absolute size-7 rounded-[80%_10%_80%_10%] bg-[#476c42] shadow-sm herb-two bottom-1 left-9 rotate-75 scale-75"/></div><Sparkles className="dish-spark absolute size-6 text-[#b79566] spark-one left-[18%] top-8"/><Sparkles className="dish-spark absolute size-6 text-[#b79566] spark-two bottom-8 right-[15%] size-4"/><span className="dish-note absolute bottom-3 right-4 -rotate-6 font-serif text-sm italic text-forest/60">made with love</span></div>;
}
export function RewardVisual({ image, name }: {
    image?: string | null;
    name: string;
}) {
    // eslint-disable-next-line @next/next/no-img-element
    return image ? <img className="reward-image h-56 w-full rounded-xl object-cover" src={image} alt={name}/> : <DishArt />;
}
