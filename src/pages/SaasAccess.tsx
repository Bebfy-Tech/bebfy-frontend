import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Layers3, LockKeyhole, ShieldCheck, ArrowRight, LoaderCircle } from 'lucide-react';
import { useSaasAuth } from '../contexts/SaasAuthContext';
import { saasPanelPath } from '../services/tenantUrls';

export function SaasAccess() {
  const navigate=useNavigate();
  const {login}=useSaasAuth();
  const [codigo,setCodigo]=useState('');
  const [senha,setSenha]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const entrar=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try { await login(Number(codigo),senha); navigate(saasPanelPath,{replace:true}); }
    catch {setError('Código ou senha inválidos, ou acesso bloqueado.');}
    finally {setBusy(false);}
  };

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#07090d] px-4 py-12 text-white sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[440px] w-[440px] rounded-full bg-blue-600/10 blur-[110px]"/>
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -right-32 h-[440px] w-[440px] rounded-full bg-emerald-500/10 blur-[110px]"/>
    <div className="relative z-10 w-full max-w-[990px] overflow-hidden rounded-[28px] border border-[#253047] bg-[#0a0f1d] shadow-[0_35px_120px_rgba(0,0,0,.55)] lg:grid lg:grid-cols-[1fr_1fr]">
      <aside className="hidden flex-col justify-between border-r border-[#263247] bg-[#0d1424] p-12 lg:flex">
        <div className="flex items-center gap-3 text-3xl font-black tracking-tighter"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Layers3 size={26}/></span>bebfy<span className="-ml-3 text-emerald-400">.</span></div>
        <div><p className="text-xs font-black uppercase tracking-[.22em] text-blue-400">CONTROL CENTER</p><h2 className="mt-5 text-4xl font-extrabold leading-tight">Controle sua plataforma com <span className="text-emerald-400">clareza e segurança.</span></h2><p className="mt-6 max-w-sm text-sm leading-7 text-slate-400">Gerencie distribuidoras, assinaturas, módulos e sua equipe administrativa em um só lugar.</p></div>
        <div className="flex items-center gap-2 border-t border-[#253247] pt-6 text-xs font-medium text-slate-500"><ShieldCheck size={18} className="text-emerald-400"/> Ambiente administrativo independente das lojas</div>
      </aside>
      <form onSubmit={e=>void entrar(e)} className="flex flex-col justify-center gap-6 p-7 sm:p-12">
        <div className="flex items-center gap-2 text-xl font-black tracking-tighter lg:hidden"><Layers3 className="text-emerald-400"/>bebfy<span className="-ml-2 text-emerald-400">.</span></div>
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-400">Acesso restrito</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Administração SaaS</h1><p className="mt-3 text-sm leading-6 text-slate-400">Entre com seu código individual e senha de administrador.</p></div>
        {error&&<p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        <label className="block space-y-2 text-sm font-semibold text-slate-300">Código de acesso
          <input required min="1" type="number" inputMode="numeric" autoComplete="username" value={codigo} onChange={e=>setCodigo(e.target.value)} placeholder="Seu código" className="w-full rounded-xl border border-[#29374e] bg-[#101a2a] px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"/>
        </label>
        <label className="block space-y-2 text-sm font-semibold text-slate-300">Senha
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 text-slate-500" size={19}/>
            <input required type={showPassword?'text':'password'} autoComplete="current-password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Sua senha" className="w-full rounded-xl border border-[#29374e] bg-[#101a2a] py-3.5 pl-11 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"/>
            <button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'} className="absolute right-3 top-2.5 rounded-lg p-1.5 text-slate-400 hover:text-white">{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button>
          </span>
        </label>
        <button type="submit" disabled={busy} className="mt-1 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-4 text-sm font-black text-[#052219] shadow-[0_14px_30px_rgba(16,185,129,.18)] transition hover:bg-emerald-300 disabled:opacity-50">
          {busy?<LoaderCircle size={18} className="animate-spin"/>:<ArrowRight size={18}/>} {busy?'Autenticando…':'Entrar no painel'}
        </button>
        <p className="text-center text-xs text-slate-500">Acesso exclusivo à administração geral da Bebfy.</p>
      </form>
    </div>
  </main>;
}
