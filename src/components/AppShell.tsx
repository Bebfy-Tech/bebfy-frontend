import { useState } from 'react';
import './tenant-workspace.css';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Building2, ChevronDown, CreditCard, FileBarChart, HandCoins, Layers3, LogOut, Menu, Package, Settings, ShoppingCart, Truck, UserRound, Users, Wallet, Warehouse, X, FileUp, CircleHelp, Store, Boxes, ClipboardList, Ruler } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileModal } from './ProfileModal';
import { tenantPath } from '../services/tenantUrls';
import { hasModule, routeModules } from '../services/moduleAccess';
import type { ComponentType } from 'react';

type Item={to:string;label:string;icon:ComponentType<{size?:number;className?:string}>;manager?:boolean;permissao?:string};
const primary:Item[]=[
 {to:'/dashboard',label:'Visão Geral',icon:Home},
 {to:'/pdv',label:'Frente de Caixa',icon:ShoppingCart},
 {to:'/vendas',label:'Vendas',icon:BarChart3},
 {to:'/caixas',label:'Controle de Caixa',icon:Wallet},
 {to:'/delivery',label:'Entregas (Delivery)',icon:Truck},
 {to:'/produtos',label:'Produtos',icon:Package},
 {to:'/estoque',label:'Estoque',icon:Warehouse},
 {to:'/clientes',label:'Clientes',icon:Users},
 {to:'/fiados',label:'Fiados',icon:HandCoins},
 {to:'/vasilhames',label:'Vasilhames',icon:ClipboardList},
 {to:'/financeiro',label:'Financeiro',icon:CreditCard,manager:true},
 {to:'/relatorios',label:'Relatórios',icon:FileBarChart,manager:true},
];
const additional:Item[]=[
 {to:'/unidades-medida',label:'Unidades de medida',icon:Ruler,permissao:'PRODUTOS_GERENCIAR'},
 {to:'/financeiro/cadastros',label:'Cadastros financeiros',icon:Settings,manager:true},
 {to:'/categorias',label:'Categorias',icon:Layers3},
 {to:'/lotes',label:'Lotes e validade',icon:Boxes},
 {to:'/fornecedores',label:'Fornecedores',icon:Building2},
 {to:'/funcionarios',label:'Funcionários e acessos',icon:UserRound,manager:true},
 {to:'/ajuda',label:'Ajuda',icon:CircleHelp},
];
const secondary:Item[]=[{to:'/estoque/importar-xml',label:'Importar XML',icon:FileUp,manager:true},{to:'/configuracoes',label:'Configurações',icon:Settings}];
export function AppShell(){
 const {user,empresa,logout,modules,modulesStatus}=useAuth();
 const location=useLocation();const navigate=useNavigate();
 const [open,setOpen]=useState(false);const [profileOpen,setProfileOpen]=useState(false);const [accountOpen,setAccountOpen]=useState(false);
 const manager=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'');
 const isPdv=location.pathname.endsWith('/pdv');
 const allowed=(i:Item)=>modulesStatus==='ready'&&(!i.manager||manager)&&(!i.permissao||manager||Boolean(user?.permissoes?.includes(i.permissao)))&&hasModule(modules,routeModules[i.to])&&(i.to!='/delivery'||hasModule(modules,'CAIXA_PDV'));
 const links=(items:Item[])=>items.filter(allowed).map(i=><NavLink key={i.to} to={tenantPath(i.to)} end={i.to==='/estoque'||i.to==='/financeiro'} onClick={()=>{setOpen(false);setAccountOpen(false);}} className={({isActive})=>'bf-menu-link '+(isActive?'bf-menu-active':'')}><i.icon size={19}/><span>{i.label}</span></NavLink>);
 const more=additional.filter(allowed);
 return <div className={'bebfy-workspace bf-workspace bf-premium-shell '+(isPdv?'bebfy-pdv-mode':'')}>
  {open&&<button className="bf-mobile-backdrop" aria-label="Fechar navegação" onClick={()=>setOpen(false)}/>}
  <aside className={'bebfy-sidebar bf-sidebar '+(open?'bf-sidebar-open':'')} aria-label="Menu da distribuidora">
    <div className="bf-sidebar-brand"><Link className="bf-premium-wordmark" to={tenantPath('dashboard')} onClick={()=>setOpen(false)}>bebfy<span>.</span></Link><button className="bf-mobile-close" aria-label="Fechar menu" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <div className="bf-company"><Store size={25}/><div><strong>{empresa?.nomeFantasia||'Distribuidora'}</strong><small>{empresa?.subdominio||'Empresa conectada'}</small></div></div>
    <nav className="bf-sidebar-nav" aria-label="Módulos disponíveis">
      <div className="bf-premium-nav-main">{links(primary)}</div>
      {more.length>0&&<details className="bf-premium-more" open={more.some(i=>location.pathname===tenantPath(i.to))||undefined}><summary>Cadastros e opções <ChevronDown size={14}/></summary>{links(more)}</details>}
      <div className="bf-premium-nav-secondary">{links(secondary)}</div>
      {modulesStatus!=='ready'&&<p className="bf-menu-status">{modulesStatus==='error'?'Não foi possível consultar módulos.':'Carregando módulos…'}</p>}
    </nav>
    <div className="bf-sidebar-footer">
      {accountOpen&&<div className="bf-premium-account"><button type="button" onClick={()=>{setProfileOpen(true);setAccountOpen(false);}}>Meu perfil</button><button type="button" onClick={()=>{logout();navigate(tenantPath(),{replace:true});}}><LogOut size={17}/> Sair do sistema</button></div>}
      <button type="button" className="bf-profile-button" aria-expanded={accountOpen} onClick={()=>setAccountOpen(v=>!v)}><span className="bf-avatar">{(user?.nome||'U')[0].toUpperCase()}</span><span className="bf-profile-name"><strong>{user?.nome||'Operador'}</strong><small>Minha conta</small></span><ChevronDown size={16}/></button>
    </div>
  </aside>
  <div className="bf-workarea"><button className="bf-mobile-menu-only" aria-label="Abrir navegação" onClick={()=>setOpen(true)}><Menu size={20}/></button><main className="bf-content"><Outlet/></main></div>
  <ProfileModal mode="tenant" open={profileOpen} onClose={()=>setProfileOpen(false)}/>
 </div>;
}
