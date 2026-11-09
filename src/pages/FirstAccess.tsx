import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saasApi } from '../services/saas';
import { tenantPath, saasLoginPath, saasPanelPath } from '../services/tenantUrls';

type InitialState = { tokenTroca: string; retorno?: 'saas'|'pdv' };

export function FirstAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const dados = location.state as InitialState | null;
  const { finalizarPrimeiroAcesso, logout } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!dados || busy) return;
    if (novaSenha.length < 10) { setErro('A nova senha precisa ter pelo menos 10 caracteres.'); return; }
    if (novaSenha !== confirmacao) { setErro('As novas senhas não conferem.'); return; }
    if (novaSenha === senhaAtual) { setErro('A nova senha deve ser diferente da senha inicial.'); return; }
    setBusy(true); setErro('');
    try {
      await finalizarPrimeiroAcesso({
        tokenTroca: dados.tokenTroca, senhaAtual,
        novaSenha, confirmarNovaSenha: confirmacao,
      });
      if (dados.retorno === 'saas') {
        await saasApi.empresas();
        navigate(saasPanelPath, {replace:true, state:null});
      } else {
        navigate(tenantPath('dashboard'), {replace:true, state:null});
      }
    } catch (error: unknown) {
      const e = error as {response?:{data?:{error?:{message?:string};message?:string}}; message?:string};
      setErro(e.response?.data?.error?.message || e.response?.data?.message || e.message || 'Não foi possível alterar a senha.');
      if (dados.retorno === 'saas' && e.response?.data?.error?.message?.includes('Acesso restrito')) logout();
    } finally {setBusy(false);}
  }

  if (!dados?.tokenTroca) {
    return <main className="grid min-h-screen place-items-center bg-[#071c22] px-5 text-white">
      <div className="max-w-md text-center"><LockKeyhole className="mx-auto text-emerald-300" size={44}/>
        <h1 className="mt-4 text-2xl font-bold">Primeiro acesso expirado</h1>
        <p className="mt-2 text-slate-400">Entre novamente para configurar sua senha.</p>
        <Link to={dados?.retorno==='saas'||window.location.pathname.toLowerCase().startsWith('/saas/')?saasLoginPath:tenantPath()} className="mt-5 inline-block rounded-xl bg-emerald-300 px-5 py-3 font-bold text-[#062e2c]">Ir para login</Link>
      </div>
    </main>;
  }
  return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[#071920] to-[#12443f] px-4 py-10 text-white">
    <form onSubmit={e=>void salvar(e)} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#102c31] p-7 shadow-2xl sm:p-9">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><KeyRound size={27}/></div>
      <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">Segurança da sua distribuidora</p>
      <h1 className="mt-2 text-3xl font-extrabold">Defina sua senha pessoal</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">Este é seu primeiro acesso. Antes de entrar no sistema, confirme a senha inicial e crie uma senha exclusiva, que só você conhece.</p>
      {erro && <p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{erro}</p>}
      <div className="mt-6 space-y-4">
        <label className="block text-sm font-bold">Senha atual
          <input value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} required type="password" autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#081d24] px-4 py-3 text-white"/>
        </label>
        <label className="block text-sm font-bold">Nova senha
          <span className="relative mt-2 block"><input required minLength={10} type={mostrar?'text':'password'} value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-[#081d24] px-4 py-3 pr-12 outline-none focus:border-emerald-300" placeholder="Mínimo de 10 caracteres"/>
            <button type="button" onClick={()=>setMostrar(!mostrar)} aria-label={mostrar?'Esconder senha':'Mostrar senha'} className="absolute right-3 top-3 text-slate-400">{mostrar?<EyeOff size={20}/>:<Eye size={20}/>}</button></span>
        </label>
        <label className="block text-sm font-bold">Confirmar nova senha
          <input required type={mostrar?'text':'password'} value={confirmacao} onChange={e=>setConfirmacao(e.target.value)} autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#081d24] px-4 py-3 outline-none focus:border-emerald-300" placeholder="Repita a nova senha"/>
        </label>
      </div>
      <button disabled={busy} type="submit" className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-4 font-extrabold text-[#07342d] disabled:opacity-60">{busy?'Salvando…':'Salvar senha e acessar'} <ArrowRight size={18}/></button>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={15}/> Sua senha é protegida no servidor.</p>
    </form>
  </main>;
}
