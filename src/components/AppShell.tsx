import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Boxes, Building2, ChevronRight, ClipboardList, CreditCard,
  FileBarChart, HandCoins, Layers3, LogOut, Menu, Package, ReceiptText,
  Settings, ShoppingCart, Truck, UserRound, Users, Wallet, Warehouse,
  X, ShieldCheck, ArrowLeft, FileUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { tenantPath } from '../services/tenantUrls';
import type { ComponentType } from 'react';

type IconType = ComponentType<{ size?: number; className?: string }>;
type MenuItem = { to: string; label: string; icon: IconType; manager?: boolean };
const groups: { title: string; items: MenuItem[] }[] = [
  { title: 'OPERAÇÃO', items: [
    { to: '/dashboard', label: 'Visão geral', icon: BarChart3 },
    { to: '/pdv', label: 'Frente de caixa / PDV', icon: ShoppingCart },
    { to: '/vendas', label: 'Vendas e comprovantes', icon: ReceiptText },
    { to: '/caixas', label: 'Controle de caixas', icon: Wallet },
    { to: '/delivery', label: 'Entregas e acertos', icon: Truck },
  ] },
  { title: 'GESTÃO', items: [
    { to: '/produtos', label: 'Produtos', icon: Package },
    { to: '/categorias', label: 'Categorias', icon: Layers3 },
    { to: '/lotes', label: 'Lotes e validade', icon: Boxes },
    { to: '/estoque', label: 'Movimentações de estoque', icon: Warehouse },
    { to: '/estoque/importar-xml', label: 'Importar NF-e XML', icon: FileUp, manager: true },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/fiados', label: 'Fiados e recebimentos', icon: HandCoins },
    { to: '/vasilhames', label: 'Vasilhames', icon: ClipboardList },
    { to: '/fornecedores', label: 'Fornecedores', icon: Building2 },
  ] },
  { title: 'ADMINISTRAÇÃO', items: [
    { to: '/financeiro', label: 'Financeiro', icon: CreditCard, manager: true },
    { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
    { to: '/funcionarios', label: 'Funcionários e acessos', icon: UserRound, manager: true },
    { to: '/configuracoes', label: 'Minha conta', icon: Settings },
  ] },
];
const managerRoles = ['PROPRIETARIO', 'ADMINISTRADOR', 'GERENTE'];

export function AppShell() {
  const { user, empresa, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const manager = managerRoles.includes(user?.cargo || '');
  const isPdv = location.pathname.endsWith('/pdv');
  const close = () => setOpen(false);
  const leave = () => { logout(); navigate(tenantPath(), { replace: true }); };

  const sidebar = (
    <aside className={`bebfy-sidebar fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-y-auto border-r border-[#1f2937] bg-[#0a0f1d] text-white transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="border-b border-[#1f2937] px-6 py-6">
        <Link to={tenantPath('dashboard')} onClick={close} className="flex items-center gap-3 text-[29px] font-black tracking-tighter">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"><Layers3 size={24}/></span>
          bebfy<span className="-ml-3 text-emerald-400">.</span>
        </Link>
        <p className="ml-[59px] text-[10px] font-bold tracking-[.2em] text-slate-500">DISTRIBUIDORA</p>
      </div>
      <div className="mx-4 mt-5 rounded-2xl border border-[#243247] bg-[#121b2c] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Building2 size={20}/></span>
          <div className="min-w-0"><strong className="block truncate text-sm text-white">{empresa?.nomeFantasia || 'Distribuidora'}</strong><span className="block truncate text-xs text-slate-400">{empresa?.subdominio || 'Sua empresa'}</span></div>
        </div>
      </div>
      <nav aria-label="Menu da distribuidora" className="flex-1 px-3 pb-6">
        {groups.map(group => <section key={group.title} className="mt-6">
          <p className="px-3 pb-2 text-[10px] font-extrabold tracking-[.22em] text-slate-500">{group.title}</p>
          {group.items.filter(i => !i.manager || manager).map(i =>
            <NavLink key={i.to} to={tenantPath(i.to)} onClick={close}
              className={({ isActive }) => `my-0.5 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${isActive ? 'border border-emerald-500/25 bg-emerald-500/12 text-emerald-300' : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <i.icon size={19} /><span className="flex-1">{i.label}</span><ChevronRight size={14} className="opacity-35"/>
            </NavLink>)}
        </section>)}
      </nav>
      <div className="border-t border-[#1f2937] p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-sm font-black text-emerald-300">{(user?.nome || 'U')[0]}</span>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.nome}</p><p className="text-xs text-slate-500">{user?.cargo?.replaceAll('_', ' ')}</p></div>
        </div>
        <button onClick={leave} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"><LogOut size={18}/> Sair do sistema</button>
      </div>
    </aside>
  );

  return <div className={`bebfy-workspace min-h-screen bg-[#07090d] text-slate-100 ${isPdv ? 'bebfy-pdv-mode' : ''}`}>
    {!isPdv && <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#1f2937] bg-[#0a0f1d] px-4 py-3 lg:hidden">
      <Link to={tenantPath('dashboard')} className="flex items-center gap-2 text-xl font-black text-white"><Layers3 size={24} className="text-emerald-400"/>bebfy<span className="-ml-2 text-emerald-400">.</span></Link>
      <button type="button" onClick={() => setOpen(!open)} aria-label="Abrir navegação" className="rounded-xl border border-[#273449] p-3 text-white">{open ? <X/> : <Menu/>}</button>
    </div>}
    {isPdv ? <div className="border-b border-[#1f2937] bg-[#0a0f1d] px-4 py-3 sm:px-7">
      <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-4">
        <Link to={tenantPath('dashboard')} className="flex items-center gap-3 text-sm font-bold text-slate-300 hover:text-white"><ArrowLeft size={18}/> <span className="hidden sm:inline">Voltar ao painel</span><span className="sm:hidden">Voltar</span></Link>
        <span className="flex items-center gap-2 text-lg font-black tracking-tight text-white"><Layers3 size={21} className="text-emerald-400"/>bebfy<span className="-ml-2 text-emerald-400">.</span><span className="ml-2 text-xs font-bold tracking-widest text-blue-400">PDV</span></span>
        <span className="hidden items-center gap-1 text-xs text-emerald-300 sm:flex"><ShieldCheck size={15}/> Sessão segura</span>
      </div>
    </div> : <>
      {open && <button aria-label="Fechar navegação" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={close}/>}
      {sidebar}
    </>}
    <div className={`min-w-0 ${isPdv ? '' : 'lg:ml-[280px]'}`}>
      {!isPdv && <header className="hidden items-center justify-between gap-4 border-b border-[#1f2937] bg-[#0a0f1d] px-8 py-4 lg:flex">
        <div className="flex items-center gap-2 text-xs font-bold tracking-[.18em] text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#10b981]"/> BEBFY OPERACIONAL</div>
        <div className="flex items-center gap-4 text-sm text-slate-400"><span>{empresa?.nomeFantasia}</span><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">{user?.nome}</span></div>
      </header>}
      <main className={`mx-auto ${isPdv ? 'max-w-[1760px] p-4 sm:p-6' : 'max-w-[1540px] p-4 pb-28 sm:p-7 lg:pb-8 xl:p-9'}`}><Outlet/></main>
      {!isPdv && <footer className="hidden py-6 text-center text-xs text-slate-600 lg:block">Bebfy · Gestão inteligente de distribuidoras · Comprovantes não fiscais</footer>}
    </div>
    {!isPdv && <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[#263247] bg-[#0a0f1d]/95 px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
      {[
        { to: 'dashboard', label: 'Início', icon: BarChart3 },
        { to: 'pdv', label: 'PDV', icon: ShoppingCart },
        { to: 'produtos', label: 'Produtos', icon: Package },
        { to: 'clientes', label: 'Clientes', icon: Users },
        { to: 'configuracoes', label: 'Conta', icon: Settings },
      ].map(item => <NavLink key={item.to} to={tenantPath(item.to)} className={({isActive}) => `flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold ${isActive ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-400'}`}>
        <item.icon size={20}/>{item.label}
      </NavLink>)}
    </nav>}
  </div>;
}
