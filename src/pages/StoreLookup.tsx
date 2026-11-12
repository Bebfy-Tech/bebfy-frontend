import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { BebfyBrand } from '../components/BebfyBrand';
import { tenantPath, validSlug } from '../services/tenantUrls';

/** Public identifier lookup. Authentication still happens on the tenant's login route. */
export function StoreLookup() {
  const [slug, setSlug] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();
  const normalized = slug.trim().toLowerCase();
  const preview = validSlug(normalized) ? normalized : 'sua-distribuidora';

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validSlug(normalized)) {
      setErro('Informe um identificador válido, usando letras, números e hífens.');
      return;
    }
    navigate(tenantPath('', normalized));
  };

  return <div className="min-h-screen bg-[#052923] text-white selection:bg-emerald-300 selection:text-[#052923]">
    <div className="relative isolate min-h-screen overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_28%,rgba(35,137,102,.22),transparent_47%),radial-gradient(ellipse_at_12%_94%,rgba(22,110,81,.18),transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex h-20 items-center justify-between border-b border-white/10">
          <Link to="/" aria-label="Bebfy, voltar ao início" className="inline-flex items-center">
            <BebfyBrand light compact />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-50/75 transition hover:text-emerald-200 sm:text-sm">
            <ArrowLeft size={17} /> Voltar ao início
          </Link>
        </header>
        <main className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-20 lg:py-20">
          <section className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-[10px] font-extrabold tracking-[.12em] text-emerald-200 sm:text-xs">
              <ShieldCheck size={15} /> ACESSO EXCLUSIVO PARA CLIENTES
            </span>
            <h1 className="mt-7 text-[clamp(2.5rem,5vw,4.15rem)] font-extrabold leading-[1.08] tracking-[-.05em]">
              Sua distribuidora.<br /><span className="text-[#6de7bb]">Seu espaço.</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-emerald-50/75">
              Cada negócio tem seu ambiente exclusivo no Bebfy. Informe o identificador da sua distribuidora para continuar.
            </p>
            <div className="mt-10 hidden gap-6 md:flex lg:flex-col">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><Building2 size={23}/></span>
                <div><strong className="text-sm">Acesso individual</strong><p className="mt-1 text-xs text-emerald-50/65">Um ambiente dedicado a cada distribuidora.</p></div>
              </div>
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><LockKeyhole size={23}/></span>
                <div><strong className="text-sm">Login de funcionário</strong><p className="mt-1 text-xs text-emerald-50/65">Entre com seu código e senha na próxima tela.</p></div>
              </div>
            </div>
          </section>
          <section aria-labelledby="lookup-heading" className="rounded-[26px] border border-emerald-200/25 bg-[#103d35]/90 p-6 shadow-[0_30px_80px_rgba(0,0,0,.28)] sm:p-9">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><Building2 size={26}/></span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-emerald-100">ÁREA DO CLIENTE</span>
            </div>
            <h2 id="lookup-heading" className="mt-7 text-2xl font-extrabold tracking-tight sm:text-[28px]">Encontre sua distribuidora</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50/70">Digite o nome curto que identifica sua loja para abrir o login correspondente.</p>
            <form onSubmit={entrar} className="mt-7" noValidate>
              <label htmlFor="identificador-loja" className="block text-sm font-bold">Identificador da distribuidora</label>
              <div className="mt-3 flex min-h-14 overflow-hidden rounded-xl border border-emerald-100/25 bg-[#071e1e] transition-colors focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-300/20">
                <span className="flex shrink-0 items-center border-r border-emerald-100/15 px-3 text-xs font-semibold text-emerald-100/65 sm:px-4 sm:text-sm">bebfy.com.br/</span>
                <input id="identificador-loja" autoFocus required maxLength={63} spellCheck={false} autoCapitalize="none" autoComplete="off" value={slug}
                  onChange={e => { setSlug(e.target.value); setErro(''); }}
                  placeholder="minha-distribuidora" aria-invalid={Boolean(erro)} aria-describedby="lookup-example lookup-error"
                  className="min-w-0 flex-1 bg-transparent px-3 py-4 text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-emerald-50/30" />
              </div>
              <p id="lookup-example" className="mt-3 break-words text-xs text-emerald-50/65">Endereço de acesso: <span className="font-semibold text-emerald-200">bebfy.com.br/{preview}</span></p>
              {erro && <p id="lookup-error" role="alert" className="mt-3 text-xs font-semibold text-rose-200">{erro}</p>}
              <button type="submit" className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#51dbab] px-4 text-sm font-extrabold text-[#052a23] transition hover:bg-[#7dedc2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Continuar para o login <ArrowRight size={19}/></button>
            </form>
            <div className="mt-7 rounded-xl border border-emerald-100/15 bg-white/[.04] p-4">
              <strong className="text-xs">Não sabe seu identificador?</strong>
              <p className="mt-1.5 text-xs leading-5 text-emerald-50/70">Solicite o endereço de acesso ao proprietário ou administrador da distribuidora.</p>
            </div>
          </section>
        </main>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-white/10 py-6 text-xs text-emerald-50/50">
          <span>© {new Date().getFullYear()} Bebfy. Todos os direitos reservados.</span>
          <span>Gestão inteligente para o mercado de bebidas</span>
        </footer>
      </div>
    </div>
  </div>;
}
