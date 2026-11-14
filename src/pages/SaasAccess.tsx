import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CreditCard, Eye, EyeOff, Layers3, LoaderCircle, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { useSaasAuth } from '../contexts/SaasAuthContext';
import { saasPanelPath } from '../services/tenantUrls';
import './saas-premium.css';
import { BebfyBrand } from '../components/BebfyBrand';

const resources = [
  { icon: Building2, title: 'Distribuidoras', description: 'Cadastros e gestão de clientes.' },
  { icon: CreditCard, title: 'Planos', description: 'Assinaturas e condições comerciais.' },
  { icon: Layers3, title: 'Módulos', description: 'Recursos habilitados por empresa.' },
  { icon: Users, title: 'Equipe', description: 'Acessos da administração SaaS.' },
];

export function SaasAccess() {
  const navigate = useNavigate();
  const { login } = useSaasAuth();
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const numero = Number(codigo);
    if (!Number.isSafeInteger(numero) || numero < 1 || !senha) {
      setError('Informe um código de administrador válido e sua senha.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(numero, senha);
      navigate(saasPanelPath, { replace: true });
    } catch {
      setError('Código ou senha inválidos, ou acesso bloqueado.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="saas-login-workspace bebfy-access-viewport relative isolate grid place-items-center overflow-hidden bg-[#041d1e] px-3 py-3 sm:px-5">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_15%,rgba(31,122,93,.32),transparent_48%),radial-gradient(ellipse_at_7%_95%,rgba(18,105,78,.23),transparent_45%)]" />
    <div className="saas-login-panel relative z-10 grid w-full max-w-[1050px] min-h-0 overflow-hidden rounded-[24px] border border-white/15 shadow-[0_35px_90px_rgba(0,0,0,.30)] lg:grid-cols-2">
      <aside className="saas-login-intro flex min-h-0 flex-col justify-between bg-[#06332d] px-6 py-6 text-white sm:px-8 sm:py-7 lg:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" aria-label="Bebfy, início" className="inline-flex"><BebfyBrand light compact /></Link>
          <span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-emerald-100">ACESSO INTERNO</span>
        </div>
        <div className="mt-5 lg:my-auto lg:py-5">
          <span className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[.12em] text-[#6ee5b9]"><ShieldCheck size={17}/> ADMINISTRAÇÃO CENTRAL</span>
          <h2 className="mt-5 max-w-md text-3xl font-extrabold leading-[1.16] tracking-[-.04em] sm:text-[39px]">Sua plataforma, sob controle.</h2>
          <p className="mt-4 max-w-sm text-sm leading-7 text-emerald-50/70">Gerencie distribuidoras, planos, módulos e colaboradores em um único ambiente administrativo.</p>
          <div className="bebfy-login-highlights mt-5 hidden grid-cols-2 gap-2 sm:grid">
            {resources.map(({icon:Icon,title,description})=><div key={title} className="rounded-2xl border border-white/10 bg-white/[.045] p-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200"><Icon size={19}/></span>
              <strong className="mt-3 block text-[13px]">{title}</strong>
              <p className="mt-1 text-[11px] leading-5 text-emerald-50/60">{description}</p>
            </div>)}
          </div>
        </div>
        <p className="mt-4 hidden border-t border-white/10 pt-4 text-[11px] text-emerald-50/50 lg:block">Bebfy · Gestão da plataforma</p>
      </aside>
      <section className="saas-login-form flex min-h-0 flex-col justify-between bg-[#f8f6ef] px-6 py-6 text-[#173c33] sm:px-8 sm:py-7 lg:px-10" aria-labelledby="saas-login-title">
        <div className="flex items-center justify-between gap-3">
          <div><span className="text-[11px] font-extrabold tracking-[.14em] text-[#147756]">CONTROL CENTER</span><h1 id="saas-login-title" className="mt-2 text-xl font-extrabold">Administração SaaS</h1></div>
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#d5e3d7] bg-white text-[#147756]"><LockKeyhole size={20}/></span>
        </div>
        <form onSubmit={e=>void entrar(e)} className="my-auto space-y-4 py-5">
          <div className="mb-5"><h2 className="text-[30px] font-extrabold tracking-[-.04em]">Bem-vindo de volta.</h2><p className="mt-2 text-sm leading-6 text-[#647c70]">Entre com suas credenciais administrativas.</p></div>
          {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
          <div><label htmlFor="saas-codigo" className="mb-2 block text-[13px] font-bold">Código de acesso</label>
            <input id="saas-codigo" autoFocus required min="1" step="1" type="number" inputMode="numeric" autoComplete="username" value={codigo} onChange={e=>{setCodigo(e.target.value);setError('');}} placeholder="Ex.: 1" className="saas-login-input min-h-14 w-full rounded-xl border border-[#cfddd2] bg-white px-4 text-sm font-semibold text-[#173c33] outline-none transition placeholder:font-normal placeholder:text-[#91a69b] focus:border-[#29ad7a] focus:ring-2 focus:ring-emerald-200"/>
          </div>
          <div><label htmlFor="saas-senha" className="mb-2 block text-[13px] font-bold">Senha</label><div className="relative">
            <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-[19px] text-[#779186]"/>
            <input id="saas-senha" required type={showPassword?'text':'password'} autoComplete="current-password" value={senha} onChange={e=>{setSenha(e.target.value);setError('');}} placeholder="Digite sua senha" className="saas-login-input min-h-14 w-full rounded-xl border border-[#cfddd2] bg-white py-3 pl-11 pr-12 text-sm font-semibold text-[#173c33] outline-none transition placeholder:font-normal placeholder:text-[#91a69b] focus:border-[#29ad7a] focus:ring-2 focus:ring-emerald-200"/>
            <button type="button" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)} className="absolute right-2 top-2.5 rounded-lg p-2 text-[#779186] hover:bg-[#f0f6f1] hover:text-[#14664b]">{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button>
          </div></div>
          <button type="submit" disabled={busy} className="mt-2 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#20bd88] px-5 text-sm font-extrabold text-[#063329] transition hover:bg-[#51dcaa] disabled:opacity-60">{busy?<LoaderCircle size={19} className="animate-spin"/>:<ArrowRight size={19}/>} {busy?'Autenticando...':'Entrar no painel'}</button>
          <p className="text-center text-xs leading-5 text-[#73887d]">Acesso exclusivo à equipe administrativa autorizada.</p>
        </form>
        <Link to="/" className="inline-flex items-center justify-center gap-2 border-t border-[#dbe6dd] pt-5 text-xs font-bold text-[#23664f] hover:text-[#0b4633]"><ArrowLeft size={15}/> Voltar à página inicial</Link>
      </section>
    </div>
  </main>;
}
