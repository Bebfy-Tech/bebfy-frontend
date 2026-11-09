import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, KeyRound, Layers3, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saasApi } from '../services/saas';
import { saasPanelPath, saasFirstAccessPath } from '../services/tenantUrls';

export function SaasAccess() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [empresa, setEmpresa] = useState('');
  const [operador, setOperador] = useState('');
  const [senha, setSenha] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [conflitoSessao, setConflitoSessao] = useState(false);

  async function executarLogin(assumirSessao = false) {
    if (carregando) return;
    setErro('');
    setCarregando(true);
    try {
      const resultado = await login({ login: operador, senha, assumirSessao }, empresa);
      setConflitoSessao(false);
      if ('trocaSenhaObrigatoria' in resultado) {
        navigate(saasFirstAccessPath, {
          replace: true,
          state: { tokenTroca: resultado.tokenTroca, retorno: 'saas' },
        });
        return;
      }
      await saasApi.empresas();
      navigate(saasPanelPath, { replace: true });
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { codigo?: string; error?: { codigo?: string; message?: string }; message?: string } };
        message?: string;
      };
      if (err.response?.status === 409 && (err.response?.data?.error?.codigo ?? err.response?.data?.codigo) === 'SESSAO_ATIVA') {
        setConflitoSessao(true);
      } else {
        logout();
        if (err.response?.status === 403) {
          setErro('Sua conta não possui acesso à administração global do Bebfy.');
        } else {
          setErro(err.response?.data?.error?.message || err.response?.data?.message ||
            err.message || 'Não foi possível autenticar.');
        }
      }
    } finally {
      setCarregando(false);
    }
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    await executarLogin(false);
  }

  return (
    <main className="min-h-screen bg-[#061b21] text-white">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-52 -right-32 h-[630px] w-[630px] rounded-full bg-emerald-500/10 blur-3xl"/>
        <div className="absolute -bottom-52 -left-48 h-[600px] w-[600px] rounded-full bg-teal-600/10 blur-3xl"/>
      </div>
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-16 px-5 py-14 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Link to="/" className="inline-flex items-center gap-2 text-3xl font-black tracking-tight"><span className="rounded-2xl bg-emerald-400 p-3 text-[#06242a]"><Layers3 size={27}/></span>bebfy<span className="text-emerald-400">.</span></Link>
          <div className="mt-20 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300"><ShieldCheck size={16}/> Acesso restrito</div>
          <h1 className="mt-6 max-w-md text-5xl font-black leading-tight tracking-[-2px]">O comando da sua plataforma. <span className="text-emerald-400">Tudo em um lugar.</span></h1>
          <p className="mt-6 max-w-md text-slate-400 leading-relaxed">Administre distribuidoras clientes, planos, disponibilidade dos módulos e operações do seu SaaS com controles centralizados.</p>
          <div className="mt-14 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><Building2 className="text-emerald-400"/><strong className="mt-4 block text-base">Gestão de empresas</strong><p className="mt-2 text-xs leading-relaxed text-slate-400">Cadastre e acompanhe suas lojas clientes.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><KeyRound className="text-emerald-400"/><strong className="mt-4 block text-base">Controle de módulos</strong><p className="mt-2 text-xs leading-relaxed text-slate-400">Habilite recursos para cada distribuidora.</p></div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/> Voltar ao site</Link>
          <form onSubmit={e => void entrar(e)} className="rounded-3xl border border-white/10 bg-[#102a31]/95 p-7 shadow-2xl shadow-black/30 sm:p-10">
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><LockKeyhole size={25}/></div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-400">Bebfy Control Center</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Administração SaaS</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">Entre com o identificador da empresa vinculada à sua conta autorizada na plataforma.</p>
            {erro && <p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{erro}</p>}
            <div className="mt-7 space-y-5">
              <label className="block text-sm font-semibold text-slate-200">Subdomínio da empresa
                <input value={empresa} onChange={e=>setEmpresa(e.target.value.toLowerCase())} required placeholder="minha-distribuidora" autoComplete="organization"
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-[#071d23] px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"/>
              </label>
              <label className="block text-sm font-semibold text-slate-200">Código do operador ou CPF
                <input value={operador} onChange={e=>setOperador(e.target.value)} required placeholder="Seu código de acesso" autoComplete="username"
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-[#071d23] px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"/>
              </label>
              <label className="block text-sm font-semibold text-slate-200">Senha de acesso
                <span className="relative mt-2 block">
                  <input type={visivel?'text':'password'} value={senha} onChange={e=>setSenha(e.target.value)} required autoComplete="current-password" placeholder="Digite sua senha"
                    className="w-full rounded-xl border border-slate-600 bg-[#071d23] py-3.5 pl-4 pr-12 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"/>
                  <button type="button" onClick={()=>setVisivel(!visivel)} aria-label={visivel?'Ocultar senha':'Mostrar senha'} className="absolute right-4 top-3.5 text-slate-400">{visivel?<EyeOff size={19}/>:<Eye size={19}/>}</button>
                </span>
              </label>
            </div>
            <button type="submit" disabled={carregando} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#a5f3ca] py-4 font-black text-[#073b36] transition hover:bg-emerald-300 disabled:opacity-60">{carregando?'Validando acesso…':'Entrar no painel'} <ArrowRight size={18}/></button>
            <p className="mt-5 text-center text-xs text-slate-500">Autorização validada diretamente pelo servidor.</p>
          </form>
        </div>
      </div>
      {conflitoSessao && <div role="dialog" aria-modal="true" aria-labelledby="saas-conflito"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#102c32] p-7 shadow-2xl">
          <h2 id="saas-conflito" className="text-xl font-extrabold">Já existe um acesso neste usuário</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Deseja entrar e desconectar a sessão anterior?
          </p>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={()=>setConflitoSessao(false)} disabled={carregando}
              className="flex-1 rounded-xl border border-slate-500 p-3 font-semibold">Não</button>
            <button type="button" onClick={()=>void executarLogin(true)} disabled={carregando}
              className="flex-1 rounded-xl bg-emerald-300 p-3 font-extrabold text-[#0a302e]">Sim, acessar</button>
          </div>
        </div>
      </div>}
    </main>
  );
}
