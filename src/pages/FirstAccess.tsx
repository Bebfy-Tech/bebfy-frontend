import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { BebfyBrand } from '../components/BebfyBrand';
import { useAuth } from '../contexts/AuthContext';
import { validNewPassword,newPasswordHint,authError } from '../services/authFeedback';
import { tenantPath, tenantFromPath } from '../services/tenantUrls';

type InitialState = { tokenTroca: string; tenant?:string };

export function FirstAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const dados = location.state as InitialState | null;
  const slug=tenantFromPath();
  const { finalizarPrimeiroAcesso } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!dados?.tokenTroca || !slug || dados.tenant!==slug || busy) return;
    if(!validNewPassword(novaSenha)){setErro(newPasswordHint);return;}

    if (novaSenha !== confirmacao) { setErro('As novas senhas não conferem.'); return; }
    if (novaSenha === senhaAtual) { setErro('A nova senha deve ser diferente da senha inicial.'); return; }
    setBusy(true); setErro('');
    try {
      await finalizarPrimeiroAcesso({
        tokenTroca: dados.tokenTroca, senhaAtual,
        novaSenha, confirmarNovaSenha: confirmacao,
      });
      setSenhaAtual('');setNovaSenha('');setConfirmacao('');
      navigate(tenantPath('dashboard'), {replace:true, state:null});
    } catch (error: unknown) {
      setErro(authError(error,'Não foi possível alterar a senha. Entre novamente se a autorização expirou.'));
    } finally {setBusy(false);}
  }

  if (!dados?.tokenTroca || !slug || dados.tenant!==slug) {
    return <main className="grid min-h-screen place-items-center bg-[#0d0e11] px-5 text-white">
      <div className="max-w-md text-center"><LockKeyhole className="mx-auto text-emerald-300" size={44}/>
        <h1 className="mt-4 text-2xl font-bold">Primeiro acesso expirado</h1>
        <p className="mt-2 text-slate-400">Entre novamente para configurar sua senha.</p>
        <Link to={tenantPath()} className="mt-5 inline-block rounded-xl bg-emerald-300 px-5 py-3 font-bold text-[#062e2c]">Ir para login</Link>
      </div>
    </main>;
  }
  return <main className="grid min-h-[100dvh] place-items-center bg-[#0d0e11] px-4 py-5 text-white">
    <form onSubmit={e=>void salvar(e)} className="w-full max-w-md rounded-xl border border-[#343d46] bg-[#17191e] p-6 shadow-[0_30px_75px_rgba(0,0,0,.3)] sm:p-9">
      <div className="mb-5 flex items-center justify-between gap-3"><BebfyBrand light compact /><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-200"><KeyRound size={23}/></div></div>
      <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">{slug} · Primeiro acesso</p>
      <h1 className="mt-2 text-3xl font-extrabold">Defina sua senha pessoal</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">Este é seu primeiro acesso. Antes de entrar no sistema, confirme a senha inicial e crie uma senha exclusiva, que só você conhece.</p>
      {erro && <p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{erro}</p>}
      <div className="mt-5 space-y-3"><p className="text-xs leading-5 text-emerald-200">{newPasswordHint}</p>
        <label className="block text-sm font-bold">Senha atual
          <input value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} required disabled={busy} type="password" autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#20262d] px-4 py-3 text-white"/>
        </label>
        <label className="block text-sm font-bold">Nova senha
          <span className="relative mt-2 block"><input required disabled={busy} minLength={12} type={mostrar?'text':'password'} value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-[#20262d] px-4 py-3 pr-12 outline-none focus:border-emerald-300" placeholder="Informe sua nova senha"/>
            <button type="button" onClick={()=>setMostrar(!mostrar)} aria-label={mostrar?'Esconder senha':'Mostrar senha'} className="absolute right-3 top-3 text-slate-400">{mostrar?<EyeOff size={20}/>:<Eye size={20}/>}</button></span>
        </label>
        <label className="block text-sm font-bold">Confirmar nova senha
          <input required type={mostrar?'text':'password'} value={confirmacao} onChange={e=>setConfirmacao(e.target.value)} autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#20262d] px-4 py-3 outline-none focus:border-emerald-300" placeholder="Repita a nova senha"/>
        </label>
      </div>
      <button disabled={busy} type="submit" className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#52dcb0] px-5 py-4 font-extrabold text-[#07342d] disabled:opacity-60">{busy?'Salvando…':'Salvar senha e acessar'} <ArrowRight size={18}/></button>
      <Link to={tenantPath()} className="mt-4 block text-center text-sm font-semibold text-emerald-300 hover:underline">Voltar ao login</Link>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-50/60"><ShieldCheck size={15}/> Sua senha é protegida no servidor.</p>
    </form>
  </main>;
}
