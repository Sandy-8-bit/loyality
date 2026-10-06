'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react';
export function Notice({ message, success = false }: {
    message?: string;
    success?: boolean;
}) {
    if (!message)
        return null;
    return <div className={`notice my-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-800 [&>svg]:mt-0.5 [&>svg]:shrink-0 ${success ? "notice-success !border-emerald-200 !bg-emerald-50 !text-emerald-800" : ""}`} role={success ? 'status' : 'alert'}>{success ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}<span>{message}</span></div>;
}
export function Busy({ label = 'Loading' }: {
    label?: string;
}) { return <span className="busy inline-flex items-center justify-center gap-2 text-sm"><LoaderCircle className="spin animate-spin" size={18}/>{label}</span>; }
export function Modal({ title, children, onClose }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => { dialog.current?.showModal(); }, []);
    return <dialog className="modal m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-white p-6 text-ink shadow-2xl sm:p-8" ref={dialog} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget)
        onClose(); }} aria-labelledby="modal-title"><div className="modal-heading flex items-center justify-between gap-3 [&>h2]:text-xl [&>h2]:font-medium [&>h2]:tracking-tight"><h2 id="modal-title">{title}</h2><button className="icon-button inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sage hover:text-forest" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>{children}</dialog>;
}
