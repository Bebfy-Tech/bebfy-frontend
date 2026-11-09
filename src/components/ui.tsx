import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Plus, RefreshCcw } from 'lucide-react';

export const dinheiro=(v:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
export const dataBR=(v:unknown)=>v?new Date(String(v)).toLocaleDateString('pt-BR'):'—';
export const mensagemErro=(err:unknown):string=>{
  const e=err as {response?:{data?:{message?:string|string[];error?:{message?:string}};status?:number};message?:string};
  const m=e?.response?.data?.message??e?.response?.data?.error?.message??e?.message;
  if(e?.response?.status===403)return 'Acesso não permitido para seu perfil ou módulo desativado.';
  return Array.isArray(m)?m.join(' · '):m||'Não foi possível concluir. Verifique os dados e tente novamente.';
};
export const card='rounded-2xl border border-slate-200 bg-white shadow-sm';
export const input='w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 disabled:bg-slate-100';
export const btn='inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b655c] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#09564e] disabled:cursor-not-allowed disabled:opacity-50';
export const secondary='inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export function PageTitle({title,subtitle,action,onReload,loading}:{title:string;subtitle:string;action?:()=>void;onReload?:()=>void;loading?:boolean}){
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-teal-700">PAINEL BEBFY</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#10353a] sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><div className="flex gap-2">{onReload&&<button type="button" onClick={onReload} disabled={loading} aria-label="Atualizar dados" className={secondary}><RefreshCcw size={16} className={loading?'animate-spin':''}/></button>}{action&&<button type="button" onClick={action} className={btn}><Plus size={17}/> Novo cadastro</button>}</div></div>;
}
export function Notice({message,success=false,onClose}:{message:string;success?:boolean;onClose?:()=>void}) {
  if(!message)return null;
  return <div role={success?'status':'alert'} className={`mb-5 flex items-start gap-2 rounded-xl border p-3.5 text-sm ${success?'border-emerald-200 bg-emerald-50 text-emerald-900':'border-rose-200 bg-rose-50 text-rose-800'}`}>{success?<CheckCircle2 size={18} className="shrink-0"/>:<AlertCircle size={18} className="shrink-0"/>}<span className="flex-1">{message}</span>{onClose&&<button type="button" onClick={onClose} aria-label="Fechar mensagem">×</button>}</div>;
}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#071b22]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-black text-[#10353a]">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar janela" className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-600">✕</button></div>{children}</div></div>;}
export function Empty({children}:{children:ReactNode}){return <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">{children}</div>;}
