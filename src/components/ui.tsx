import { useEffect, useId, useRef } from 'react';
import type { ReactNode, InputHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2, Plus, RefreshCcw, Inbox, X } from 'lucide-react';

export const dinheiro=(v:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
export const dataBR=(v:unknown)=>v?new Date(String(v)).toLocaleDateString('pt-BR'):'—';
export const mensagemErro=(err:unknown):string=>{
  const e=err as {response?:{data?:{message?:string|string[];error?:{message?:string}};status?:number};message?:string};
  const m=e?.response?.data?.message??e?.response?.data?.error?.message??e?.message;
  if(e?.response?.status===429)return 'Muitas tentativas. Aguarde um momento e tente novamente.';
  if(!e?.response&&e?.message==='Network Error')return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  if(e?.response?.status===403)return 'Acesso não permitido para seu perfil ou módulo desativado.';
  return Array.isArray(m)?m.join(' · '):m||'Não foi possível concluir. Verifique os dados e tente novamente.';
};
export const card='bf-panel rounded-lg border border-[#285446] bg-[#0b332d]';
export const input='bf-input w-full min-h-9 rounded-md border border-[#386251] bg-[#103b32] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-[#68e8b8] focus:ring-2 focus:ring-emerald-300/15 disabled:opacity-50';
export const btn='bf-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#43dbab] px-4 py-3 text-sm font-extrabold text-[#063127] shadow-[0_8px_22px_rgba(16,185,129,.16)] transition hover:bg-[#68e8b8] disabled:cursor-not-allowed disabled:opacity-50';
export const secondary='bf-action bf-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#386251] bg-[#103830] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#68e8b8]/50 hover:bg-[#175040] disabled:opacity-50';

export function PageTitle({title,subtitle,action,onReload,loading,actionLabel='Novo cadastro'}:{title:string;subtitle:string;action?:()=>void;onReload?:()=>void;loading?:boolean;actionLabel?:string}){
  return <div className="bf-page-title mb-3 flex flex-wrap items-center justify-between gap-3"><div><h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><div className="flex gap-2">{onReload&&<button type="button" onClick={onReload} disabled={loading} aria-label="Atualizar dados" title="Atualizar dados" className={secondary}><RefreshCcw size={16} className={loading?'animate-spin':''}/></button>}{action&&<button type="button" onClick={action} className={btn}><Plus size={17}/> {actionLabel}</button>}</div></div>;
}
export function Notice({message,success=false,onClose}:{message:string;success?:boolean;onClose?:()=>void}) {
  if(!message)return null;
  return <div role={success?'status':'alert'} className={`bf-notice flex items-start gap-2 rounded-xl border p-3 text-sm ${success?'bf-toast':'mb-3'} ${success?'border-emerald-500/30 bg-emerald-500/10 text-emerald-200':'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{success?<CheckCircle2 size={18} className="shrink-0"/>:<AlertCircle size={18} className="shrink-0"/>}<span className="flex-1">{message}</span>{onClose&&<button type="button" onClick={onClose} aria-label="Fechar mensagem" className="bf-notice-close"><X size={16}/></button>}</div>;
}
// A stack ensures only the topmost shared modal consumes Escape or traps focus.
const dialogStack:HTMLDivElement[]=[];
export function Modal({title,onClose,children,wide=false,busy=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean;busy?:boolean}){
 const ref=useRef<HTMLDivElement>(null),headingId=useId();
 const close=useRef(onClose),blocked=useRef(busy);close.current=onClose;blocked.current=busy;
 useEffect(()=>{
   const before=document.activeElement as HTMLElement|null,panel=ref.current;
   if(!panel)return;
   dialogStack.push(panel);panel.focus();
   const key=(e:KeyboardEvent)=>{
    if(dialogStack[dialogStack.length-1]!==panel)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!blocked.current)close.current();}
    if(e.key==='Tab'){
      const nodes=Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'&&el.tabIndex>=0);
      if(!nodes.length){e.preventDefault();panel.focus();return;}
      const first=nodes[0],last=nodes[nodes.length-1],active=document.activeElement;
      if(e.shiftKey&&(active===first||active===panel||!panel.contains(active))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(active===last||active===panel||!panel.contains(active))){e.preventDefault();first.focus();}
    }
   };
   document.addEventListener('keydown',key,true);
   return()=>{document.removeEventListener('keydown',key,true);const idx=dialogStack.lastIndexOf(panel),wasTop=idx===dialogStack.length-1;if(idx>=0)dialogStack.splice(idx,1);if(wasTop){const top=dialogStack[dialogStack.length-1];if(before?.isConnected&&(!top||top.contains(before)))before.focus();else top?.focus();}};
 },[]);
 return <div className={`bf-dialog-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 ${wide?'bf-dialog-wide':''}`} role="presentation"><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={headingId} aria-busy={busy} className="bf-dialog-body bf-shared-dialog my-auto max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#386251] bg-[#0b332d] p-5 text-slate-100 sm:p-6"><div className="bf-dialog-heading mb-4 flex items-center justify-between gap-4"><h2 id={headingId} className="text-xl font-bold text-white">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Fechar janela" className="bf-dialog-close rounded-md border border-[#386251] px-3 py-2 font-bold text-slate-300"><X size={18}/></button></div>{children}</div></div>;
}
export function Empty({children}:{children:ReactNode}){return <div className="bf-empty flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#386251] bg-[#103830] p-5 text-center text-sm text-slate-400 sm:p-6"><span className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><Inbox size={25}/></span><p className="max-w-sm leading-relaxed">{children}</p></div>;}

/** Displays currency without changing the decimal string sent to the API. */
export function MoneyInput({value,onValue, ...props}: Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'|'type'|'min'|'step'> & {value:string|number;onValue:(v:string)=>void}){
  const shown=value===''?'':dinheiro(value);
  return <input {...props} type="text" inputMode="numeric" value={shown} onChange={e=>{const digits=e.target.value.replace(/\D/g,'').slice(0,11);onValue(digits?String(Number(digits)/100):'');}} placeholder={props.placeholder||'R$ 0,00'}/>;
}
export function maskDocument(raw:string,kind:'cpf'|'cnpj'|'cpfCnpj'){
  const d=raw.replace(/\D/g,'').slice(0,kind==='cpf'?11:14);
  if(kind==='cnpj'||d.length>11)return d.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2}\.\d{3})(\d)/,'$1.$2').replace(/(\.\d{3})(\d)/,'$1/$2').replace(/(\/\d{4})(\d)/,'$1-$2');
  return d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3}\.\d{3})(\d)/,'$1.$2').replace(/(\.\d{3})(\d)/,'$1-$2');
}
export function maskPhone(raw:string){
  const d=raw.replace(/\D/g,'').slice(0,11);
  if(d.length<=2)return d;
  return '('+d.slice(0,2)+') '+d.slice(2).replace(d.length>10?/^(\d{5})(\d)/:/^(\d{4})(\d)/,'$1-$2');
}
