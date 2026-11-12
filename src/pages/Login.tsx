import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tenantFromPath, tenantPath } from '../services/tenantUrls';
import { BebfyBrand } from '../components/BebfyBrand';
import { useTheme } from '../contexts/ThemeContext';
import {
  ArrowLeft, ArrowRight, AlertCircle, Boxes, CreditCard, Eye, EyeOff,
  LockKeyhole, Moon, Package, ShieldCheck, ShoppingCart, Sun, UserRound, X,
} from 'lucide-react';

const highlights = [
  { icon: ShoppingCart, title: 'Frente de caixa', description: 'Vendas e atalhos para o balcão.' },
  { icon: CreditCard, title: 'Clientes e fiado', description: 'Histórico e recebimentos.' },
  { icon: Boxes, title: 'Estoque e lotes', description: 'Quantidades e validade.' },
  { icon: Package, title: 'Produtos', description: 'Cadastros e preços organizados.' },
];

const gestores = ['PROPRIETARIO', 'ADMINISTRADOR', 'GERENTE'];

export const Login: React.FC = () => {
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [conflitoSessao, setConflitoSessao] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const slug = tenantFromPath();

  const realizarLogin = async (assumirSessao = false) => {
    if (carregando) return;
    setErro(null);
    setCarregando(true);
    try {
      const resultado = await login({
        login: loginInput.trim(), senha: senhaInput, assumirSessao,
      });
      setConflitoSessao(false);
      if ('trocaSenhaObrigatoria' in resultado) {
        navigate(tenantPath('primeiro-acesso'), {
          replace: true,
          state: { tokenTroca: resultado.tokenTroca, retorno: 'pdv' },
        });
      } else {
        navigate(tenantPath(gestores.includes(resultado.usuario.cargo) ? 'dashboard' : 'pdv'), { replace: true });
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { codigo?: string; error?: { codigo?: string; message?: string }; message?: string }; status?: number };
        message?: string;
      };
      if (error.response?.status === 409 &&
        (error.response?.data?.error?.codigo ?? error.response?.data?.codigo) === 'SESSAO_ATIVA') {
        setConflitoSessao(true);
      } else {
        setErro(error.response?.data?.error?.message || error.response?.data?.message ||
          error.message || 'Não foi possível conectar ao servidor.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !senhaInput) {
      setErro('Informe o código do funcionário e a senha.');
      return;
    }
    void realizarLogin(false);
  };

  return <div className="relative isolate flex min-h-screen items-center justify-center overflow-x-hidden bg-[#082a28] p-3 font-sans text-[#14352e] selection:bg-emerald-200 sm:p-6 lg:p-10">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_10%,rgba(30,134,97,.35),transparent_48%),radial-gradient(ellipse_at_4%_90%,rgba(18,93,74,.35),transparent_36%)]" />
    <main className="relative z-10 grid w-full max-w-[1120px] overflow-hidden rounded-[25px] border border-white/15 bg-[#faf8f2] shadow-[0_36px_90px_rgba(0,0,0,.28)] lg:min-h-[650px] lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-[#082d29] px-6 pb-7 pt-7 text-white sm:px-10 sm:pb-9 sm:pt-9 lg:px-12 lg:pb-10 lg:pt-11" aria-labelledby="bebfy-login-about">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" aria-label="Bebfy, página inicial" className="inline-flex">
            <BebfyBrand light compact />
          </Link>
          <span className="rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-emerald-100/90">ACESSO DO CLIENTE</span>
        </div>

        <div className="mt-7 space-y-5 lg:my-auto lg:py-12">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100">
            <ShieldCheck size={16} className="shrink-0 text-emerald-300" />
            <span className="min-w-0 truncate">Ambiente: {slug}</span>
          </div>
          <div>
            <h1 id="bebfy-login-about" className="max-w-[420px] text-[clamp(1.75rem,3vw,2.45rem)] font-extrabold leading-[1.18] tracking-[-.045em]">Sua operação em boas mãos.</h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-emerald-50/70">
              Vendas, produtos, estoque e clientes organizados em um só lugar. Tudo pronto para você começar o dia.
            </p>
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid">
            {highlights.map(({icon:Icon,title,description})=>
              <div key={title} className="rounded-2xl border border-emerald-200/15 bg-white/[.045] p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200"><Icon size={19}/></span>
                <strong className="mt-3 block text-[13px] font-bold text-white">{title}</strong>
                <p className="mt-1 text-[11px] leading-5 text-emerald-50/60">{description}</p>
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 hidden text-[11px] text-emerald-50/40 lg:block">Bebfy · Gestão inteligente para o mercado de bebidas</p>
      </section>

      <section className={`flex min-w-0 flex-col justify-between px-6 py-8 transition-colors sm:px-10 sm:py-11 lg:px-12 ${theme === 'dark' ? 'bg-[#0d1e20] text-white' : 'bg-[#faf8f2] text-[#173a31]'}`} aria-labelledby="bebfy-login-title">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={`text-[11px] font-extrabold uppercase tracking-[.13em] ${theme === 'dark' ? 'text-emerald-300' : 'text-[#178463]'}`}>ÁREA DE ACESSO</p>
            <h2 id="bebfy-login-title" className="mt-1 text-xl font-extrabold tracking-tight">Entrar no Bebfy</h2>
          </div>
          <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-colors ${theme === 'dark' ? 'border-white/15 bg-white/[.04] text-emerald-100 hover:bg-white/10' : 'border-[#d8e5db] bg-white text-[#3d665a] hover:bg-[#eef4ee]'}`}>
            {theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}
          </button>
        </div>

        <div className="my-auto py-9 lg:py-11">
          <div className="mb-8">
            <h3 className="text-[clamp(1.65rem,2.9vw,2.15rem)] font-extrabold tracking-[-.04em]">Bem-vindo de volta.</h3>
            <p className={`mt-2 text-sm leading-6 ${theme === 'dark' ? 'text-emerald-50/65' : 'text-[#688076]'}`}>Informe suas credenciais para continuar.</p>
          </div>

          {erro && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-200">
            <AlertCircle size={19} className="mt-0.5 shrink-0 text-rose-400"/><span>{erro}</span>
          </div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="bebfy-codigo" className="mb-2 block text-[13px] font-bold">Código do funcionário</label>
              <div className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 transition-all focus-within:border-[#39b987] focus-within:ring-[3px] focus-within:ring-emerald-300/15 ${theme === 'dark' ? 'border-white/15 bg-[#102b2a] text-emerald-100/55' : 'border-[#d2dfd5] bg-white text-[#789085]'}`}>
                <UserRound size={19} className="shrink-0"/>
                <input id="bebfy-codigo" autoFocus required autoComplete="username" inputMode="text" value={loginInput} onChange={e => {setLoginInput(e.target.value);setErro(null);}}
                  placeholder="Ex.: 1" className={`min-w-0 w-full flex-1 bg-transparent py-4 text-sm font-semibold outline-none placeholder:font-normal ${theme === 'dark' ? 'text-white placeholder:text-emerald-100/35' : 'text-[#163b31] placeholder:text-[#93a69d]'}`}/>
              </div>
            </div>
            <div>
              <label htmlFor="bebfy-senha" className="mb-2 block text-[13px] font-bold">Senha de acesso</label>
              <div className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 transition-all focus-within:border-[#39b987] focus-within:ring-[3px] focus-within:ring-emerald-300/15 ${theme === 'dark' ? 'border-white/15 bg-[#102b2a] text-emerald-100/55' : 'border-[#d2dfd5] bg-white text-[#789085]'}`}>
                <LockKeyhole size={19} className="shrink-0"/>
                <input id="bebfy-senha" type={mostrarSenha ? 'text' : 'password'} required autoComplete="current-password" value={senhaInput} onChange={e => {setSenhaInput(e.target.value);setErro(null);}}
                  placeholder="Digite sua senha" className={`min-w-0 w-full flex-1 bg-transparent py-4 text-sm font-semibold outline-none placeholder:font-normal ${theme === 'dark' ? 'text-white placeholder:text-emerald-100/35' : 'text-[#163b31] placeholder:text-[#93a69d]'}`}/>
                <button type="button" onClick={()=>setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha?'Ocultar senha':'Mostrar senha'} aria-pressed={mostrarSenha}
                  className={`shrink-0 rounded-lg p-1.5 transition-colors ${theme === 'dark' ? 'hover:text-white' : 'hover:text-[#0e755a]'}`}>
                  {mostrarSenha ? <EyeOff size={19}/> : <Eye size={19}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={carregando} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#42d4a0] px-5 text-sm font-extrabold text-[#073328] transition hover:bg-[#6ce5b5] disabled:cursor-wait disabled:opacity-60">
              {carregando ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-[#06352c] border-t-transparent"/> Entrando...</> : <>Entrar no sistema <ArrowRight size={19}/></>}
            </button>
          </form>

          <p className={`mt-5 text-center text-xs leading-5 ${theme === 'dark' ? 'text-emerald-50/55' : 'text-[#6f8278]'}`}><Link to={tenantPath('recuperar-senha')} className="font-extrabold text-emerald-300 hover:underline">Recuperar acesso por e-mail</Link></p>
          <Link to="/acessar" className={`mt-6 flex items-center justify-center gap-2 text-xs font-bold transition-colors ${theme === 'dark' ? 'text-emerald-200 hover:text-white' : 'text-[#17684f] hover:text-[#0d4937]'}`}><ArrowLeft size={16}/> Trocar de distribuidora</Link>
        </div>

        <div className={`border-t pt-5 text-center text-[11px] ${theme === 'dark' ? 'border-white/10 text-emerald-50/40' : 'border-[#dce8dc] text-[#71867b]'}`}>
          Acesso destinado aos funcionários autorizados.
        </div>
      </section>
    </main>

    {conflitoSessao && <div role="dialog" aria-modal="true" aria-labelledby="login-conflito-titulo" className="fixed inset-0 z-[100] flex items-center justify-center bg-[#041d1c]/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-emerald-200/20 bg-[#0d302b] p-7 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300/10 text-amber-200"><AlertCircle size={25}/></span>
          <button type="button" onClick={()=>setConflitoSessao(false)} disabled={carregando} aria-label="Fechar aviso" className="rounded-lg p-2 text-emerald-100/65 hover:bg-white/10"><X size={20}/></button>
        </div>
        <h2 id="login-conflito-titulo" className="mt-5 text-xl font-extrabold">Este usuário já está conectado</h2>
        <p className="mt-3 text-sm leading-6 text-emerald-50/75">Já existe uma sessão utilizando este acesso. Se continuar, a sessão anterior será encerrada.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={()=>setConflitoSessao(false)} disabled={carregando} className="min-h-12 flex-1 rounded-xl border border-emerald-100/25 px-4 font-bold text-emerald-100 hover:bg-white/5 disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={()=>void realizarLogin(true)} disabled={carregando} className="min-h-12 flex-1 rounded-xl bg-[#4adaab] px-4 font-extrabold text-[#06372b] hover:bg-[#73ebbf] disabled:opacity-50">{carregando ? 'Entrando...' : 'Continuar e desconectar'}</button>
        </div>
      </div>
    </div>}
  </div>;
};
