import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaasAuth } from '../contexts/SaasAuthContext';
import { saasPanelPath } from '../services/tenantUrls';

export function SaasAccess() {
 const navigate=useNavigate();
 const {login}=useSaasAuth();
 const [codigo,setCodigo]=useState('');
 const [senha,setSenha]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const entrar=async(e:React.FormEvent)=>{
  e.preventDefault();setBusy(true);setError('');
  try { await login(Number(codigo),senha); navigate(saasPanelPath,{replace:true}); }
  catch {setError('Código ou senha inválidos, ou acesso bloqueado.');}
  finally {setBusy(false);}
 };
 return <main className="grid min-h-screen place-items-center bg-[#071d24] px-5 text-white">
  <form onSubmit={e=>void entrar(e)} className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-[#102a31] p-8 shadow-2xl">
   <div><p className="text-sm font-bold uppercase tracking-widest text-emerald-300">Bebfy Control Center</p><h1 className="mt-2 text-3xl font-black">Administração SaaS</h1><p className="mt-2 text-sm text-slate-400">Acesso exclusivo à equipe que administra a plataforma Bebfy.</p></div>
   {error&&<p role="alert" className="rounded-xl bg-rose-900/30 p-3 text-sm text-rose-200">{error}</p>}
   <label className="block space-y-2 text-sm font-semibold">Código de acesso<input required type="number" min="1" autoComplete="username" value={codigo} onChange={e=>setCodigo(e.target.value)} className="w-full rounded-xl border border-white/20 bg-[#061b21] p-4 text-white" placeholder="Seu código"/></label>
   <label className="block space-y-2 text-sm font-semibold">Senha<input required type="password" autoComplete="current-password" value={senha} onChange={e=>setSenha(e.target.value)} className="w-full rounded-xl border border-white/20 bg-[#061b21] p-4 text-white" placeholder="Sua senha"/></label>
   <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-300 p-4 font-extrabold text-[#073b36] disabled:opacity-50">{busy?'Entrando…':'Entrar no painel'}</button>
  </form>
 </main>;
}
