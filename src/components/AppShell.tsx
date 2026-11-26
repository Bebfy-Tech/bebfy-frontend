import { useState } from 'react';
import './tenant-workspace.css';
import { BebfyBrand } from './BebfyBrand';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Boxes, Building2, ChevronRight, ClipboardList, CreditCard,
  FileBarChart, HandCoins, Layers3, LogOut, Menu, Package, ReceiptText,
  Settings, ShoppingCart, Truck, UserRound, Users, Wallet, Warehouse,
  X, FileUp, CircleHelp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileModal } from './ProfileModal';
import { tenantPath } from '../services/tenantUrls';
import type { ComponentType } from 'react';
import { hasModule, routeModules } from '../services/moduleAccess';

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
    { to: '/relatorios', label: 'Relatórios', icon: FileBarChart, manager: true },
    { to: '/funcionarios', label: 'Funcionários e acessos', icon: UserRound, manager: true },
    { to: '/configuracoes', label: 'Minha conta', icon: Settings },
  ] },
  { title: 'AJUDA', items: [
    { to: '/ajuda', label: 'Ajuda e primeiros passos', icon: CircleHelp },
  ] },
];
const managerRoles = ['PROPRIETARIO', 'ADMINISTRADOR', 'GERENTE'];

export function AppShell() {
  const { user, empresa, logout, modules, modulesStatus } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen,setProfileOpen] = useState(false);
  const manager = managerRoles.includes(user?.cargo || '');
  const isPdv = location.pathname.endsWith('/pdv');
  const route = location.pathname.split('/').filter(Boolean).slice(1).join('/');
  const visibleGroups = groups.map(group => ({...group,items:group.items.filter(i => (!i.manager || manager) && modulesStatus === 'ready' && hasModule(modules,routeModules[i.to]))})).filter(g=>g.items.length);
  const activeGroup = visibleGroups.find(g=>g.items.some(i=>i.to==='/'+route))?.title;
  const [expanded,setExpanded]=useState<{route:string;group:string}|null>(null);
  const openGroup=expanded?.route===route?expanded.group:(activeGroup||visibleGroups[0]?.title||'');
  const close = () => setOpen(false);
  const leave = () => { logout(); navigate(tenantPath(), { replace: true }); };

  return <div className={`bebfy-workspace bf-workspace ${isPdv ? 'bebfy-pdv-mode' : ''}`}>
    {open&&<button type="button" aria-label="Fechar navegação" className="bf-mobile-backdrop" onClick={close}/>}
    <aside className={`bebfy-sidebar bf-sidebar ${open?'bf-sidebar-open':''}`} aria-label="Menu da distribuidora">
      <div className="bf-sidebar-brand">
        <Link to={tenantPath('dashboard')} onClick={close} aria-label="Bebfy — painel"><BebfyBrand light compact/></Link>
        <button type="button" className="bf-mobile-close" onClick={close} aria-label="Fechar menu"><X size={20}/></button>
      </div>
      <div className="bf-company"><Building2 size={18}/><div><strong>{empresa?.nomeFantasia||'Distribuidora'}</strong><small>{empresa?.subdominio||'Sua empresa'}</small></div></div>
      <nav className="bf-sidebar-nav" aria-label="Módulos disponíveis">
        {visibleGroups.map(group=><section key={group.title} className={`bf-menu-group ${openGroup===group.title?'bf-group-open':''}`}>
          <button type="button" className="bf-group-toggle" aria-expanded={openGroup===group.title} onClick={()=>setExpanded({route,group:openGroup===group.title?'':group.title})}>
            {group.title}<ChevronRight size={14}/>
          </button>
          <div className="bf-group-links">
            {group.items.map(i=><NavLink key={i.to} to={tenantPath(i.to)} end={i.to==='/estoque'} onClick={()=>{setExpanded(null);close();}} className={({isActive})=>`bf-menu-link ${isActive?'bf-menu-active':''}`}><i.icon size={17}/><span>{i.label}</span></NavLink>)}
          </div>
        </section>)}
        {modulesStatus!=='ready'&&<p className="bf-menu-status">Carregando módulos…</p>}
      </nav>
      <div className="bf-sidebar-footer">
        <button type="button" className="bf-profile-button" onClick={()=>setProfileOpen(true)} aria-label="Meu perfil e configurações">
          <span className="bf-avatar">{(user?.nome||'U')[0]}</span><span className="bf-profile-name"><strong>{user?.nome||'Operador'}</strong><small>{user?.cargo?.replaceAll('_',' ')}</small></span><Settings size={16}/>
        </button>
        <button type="button" className="bf-logout" onClick={leave}><LogOut size={17}/> Sair do sistema</button>
      </div>
    </aside>
    <div className="bf-workarea">
      <button type="button" className="bf-mobile-menu-only" onClick={()=>setOpen(true)} aria-label="Abrir navegação"><Menu size={20}/></button>
      <main className="bf-content"><Outlet/></main>
    </div>
    <ProfileModal mode="tenant" open={profileOpen} onClose={()=>setProfileOpen(false)}/>
  </div>;
}
