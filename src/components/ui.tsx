import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Plus, RefreshCcw, Inbox } from 'lucide-react';

export const dinheiro=(v:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
export const dataBR=(v:unknown)=>v?new Date(String(v)).toLocaleDateString('pt-BR'):'—';
export const mensagemErro=(err:unknown):string=>{
  const e=err as {response?:{data?:{message?:string|string[];error?:{message?:string}};status?:number};message?:string};
  const m=e?.response?.data?.message??e?.response?.data?.error?.message??e?.message;
  if(e?.response?.status===403)return 'Acesso não permitido para seu perfil ou módulo desativado.';
  return Array.isArray(m)?m.join(' · '):m||'Não foi possível concluir. Verifique os dados e tente novamente.';
};
export const card='rounded-2xl border border-[#1f2937] bg-[#0a0f1d] shadow-[0_12px_40px_rgba(0,0,0,.14)]';
export const input='w-full min-h-11 rounded-xl border border-[#283347] bg-[#101829] px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50';
export const btn='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-[#041b13] shadow-[0_8px_22px_rgba(16,185,129,.16)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50';
export const secondary='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#29364b] bg-[#111b2d] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-blue-500/40 hover:bg-[#17243a] disabled:opacity-50';

export function PageTitle({title,subtitle,action,onReload,loading}:{title:string;subtitle:string;action?:()=>void;onReload?:()=>void;loading?:boolean}){
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-emerald-400">PAINEL BEBFY</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><div className="flex gap-2">{onReload&&<button type="button" onClick={onReload} disabled={loading} aria-label="Atualizar dados" className={secondary}><RefreshCcw size={16} className={loading?'animate-spin':''}/></button>}{action&&<button type="button" onClick={action} className={btn}><Plus size={17}/> Novo cadastro</button>}</div></div>;
}
export function Notice({message,success=false,onClose}:{message:string;success?:boolean;onClose?:()=>void}) {
  if(!message)return null;
  return <div role={success?'status':'alert'} className={`mb-5 flex items-start gap-2 rounded-xl border p-3.5 text-sm ${success?'border-emerald-500/30 bg-emerald-500/10 text-emerald-200':'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{success?<CheckCircle2 size={18} className="shrink-0"/>:<AlertCircle size={18} className="shrink-0"/>}<span className="flex-1">{message}</span>{onClose&&<button type="button" onClick={onClose} aria-label="Fechar mensagem">×</button>}</div>;
}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#29364b] bg-[#0a0f1d] p-5 text-slate-100 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-black text-white">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar janela" className="rounded-xl border border-[#29364b] px-3 py-2 font-bold text-slate-300">✕</button></div>{children}</div></div>;}
export function Empty({children}:{children:ReactNode}){return <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#29364b] bg-[#0d1423] p-8 text-center text-sm text-slate-400 sm:p-10"><span className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300"><Inbox size={25}/></span><p className="max-w-sm leading-relaxed">{children}</p></div>;}
