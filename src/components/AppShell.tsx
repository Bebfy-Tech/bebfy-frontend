import { Notificacoes } from './Experiencia';
import { useEffect, useRef, useState } from 'react';
import './tenant-workspace.css';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Building2, ChevronDown, ChevronRight, Search, CreditCard, FileBarChart, HandCoins, Layers3, LogOut, Menu, Package, Settings, ShoppingCart, Truck, UserRound, Users, Wallet, Warehouse, X, FileUp, CircleHelp, Store, Boxes, ClipboardList, Ruler } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BebfyBrand } from './BebfyBrand';
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
 {to:'/compras',label:'Compras',icon:ClipboardList,manager:true},
 {to:'/clientes',label:'Clientes',icon:Users},
 {to:'/fiados',label:'Fiados',icon:HandCoins},
 {to:'/vasilhames',label:'Vasilhames',icon:ClipboardList},
 {to:'/financeiro',label:'Financeiro',icon:CreditCard,manager:true},
 {to:'/relatorios',label:'Relatórios',icon:FileBarChart},
];
const additional:Item[]=[
 {to:'/unidades-medida',label:'Unidades de medida',icon:Ruler,permissao:'PRODUTOS_GERENCIAR'},
 {to:'/financeiro/cadastros',label:'Cadastros financeiros',icon:Settings,manager:true},
 {to:'/categorias',label:'Categorias',icon:Layers3},
 {to:'/lotes',label:'Lotes e validade',icon:Boxes},
 {to:'/fornecedores',label:'Fornecedores',icon:Building2,permissao:'FORNECEDORES_GERENCIAR'},
 {to:'/funcionarios',label:'Funcionários e acessos',icon:UserRound,manager:true},
 {to:'/ajuda',label:'Ajuda',icon:CircleHelp},
];
const secondary:Item[]=[{to:'/estoque/importar-xml',label:'Importar XML',icon:FileUp,manager:true},{to:'/configuracoes',label:'Configurações',icon:Settings}];
// Preserve the existing permissions and module checks. Grouping only changes presentation.
const groups=[{label:'Operação',items:primary.slice(0,5)},{label:'Mercadorias',items:primary.slice(5,8)},{label:'Clientes',items:primary.slice(8,11)},{label:'Gestão',items:primary.slice(11)}];
const allItems=[...primary,...additional,...secondary];
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const roleLabels:Record<string,string>={PROPRIETARIO:'Proprietário',ADMINISTRADOR:'Administrador',GERENTE:'Gerente',OPERADOR_CAIXA:'Operador de caixa',FUNCIONARIO:'Funcionário',ESTOQUISTA:'Estoquista',ENTREGADOR:'Entregador'};
export function AppShell(){
 const {user,empresa,logout,modules,modulesStatus,refreshModules}=useAuth();
 const location=useLocation(),navigate=useNavigate();
 const [open,setOpen]=useState(false),[profileOpen,setProfileOpen]=useState(false),[accountOpen,setAccountOpen]=useState(false),[query,setQuery]=useState('');
 const [moreOpen,setMoreOpen]=useState(false);
 const mobileButton=useRef<HTMLButtonElement>(null),sidebar=useRef<HTMLElement>(null),searchRef=useRef<HTMLInputElement>(null),accountRef=useRef<HTMLDivElement>(null);
 const manager=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'');
 const isPdv=location.pathname.endsWith('/pdv');
 const allowed=(i:Item)=>modulesStatus==='ready'&&(i.to!=='/relatorios'||manager||Boolean(user?.permissoes?.some(p=>/^RELATORIO_00[1-9]$|^RELATORIO_01[0-3]$/.test(p))))&&(!i.manager||manager)&&(!i.permissao||manager||Boolean(user?.permissoes?.includes(i.permissao)))&&hasModule(modules,routeModules[i.to])&&(i.to!='/delivery'||hasModule(modules,'CAIXA_PDV'));
 const activeItem=allItems.find(i=>location.pathname===tenantPath(i.to));
 const matches=(i:Item)=>allowed(i)&&normalized(i.label+' '+i.to).includes(normalized(query));
 const closeNav=(restore=false)=>{setOpen(false);setAccountOpen(false);if(restore)mobileButton.current?.focus();};
 useEffect(()=>{setOpen(false);setAccountOpen(false);setQuery('');if(additional.some(i=>location.pathname===tenantPath(i.to)))setMoreOpen(true);},[location.pathname]);
 useEffect(()=>{
   const media=window.matchMedia('(min-width:1024px)');
   const handle=()=>{if(media.matches)setOpen(false);};
   media.addEventListener('change',handle);
   return()=>media.removeEventListener('change',handle);
 },[]);
 useEffect(()=>{if(open)searchRef.current?.focus();},[open]);
 useEffect(()=>{
   const key=(e:KeyboardEvent)=>{
     if(e.key==='Escape'&&!profileOpen){
       if(accountOpen){setAccountOpen(false);return;}
       if(open){e.preventDefault();setOpen(false);mobileButton.current?.focus();}
       else if(query)setQuery('');
     }
     if(e.key==='Tab'&&open&&!profileOpen&&sidebar.current){
       const items=Array.from(sidebar.current.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled)')).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
       if(!items.length)return;const first=items[0],last=items[items.length-1];
       if(e.shiftKey&&(document.activeElement===first||!sidebar.current.contains(document.activeElement))){e.preventDefault();last.focus();}
       else if(!e.shiftKey&&(document.activeElement===last||!sidebar.current.contains(document.activeElement))){e.preventDefault();first.focus();}
     }
   };
   document.addEventListener('keydown',key);
   return()=>document.removeEventListener('keydown',key);
 },[open,accountOpen,profileOpen,query]);
 useEffect(()=>{
   if(!accountOpen)return;
   const close=(e:PointerEvent)=>{if(!accountRef.current?.contains(e.target as Node))setAccountOpen(false);};
   document.addEventListener('pointerdown',close);
   return()=>document.removeEventListener('pointerdown',close);
 },[accountOpen]);
 const links=(items:Item[])=>items.filter(matches).map(i=><NavLink key={i.to} to={tenantPath(i.to)} end={i.to==='/estoque'||i.to==='/financeiro'} title={i.label} onClick={()=>closeNav()} className={({isActive})=>'bf-menu-link '+(isActive?'bf-menu-active':'')}><i.icon size={17}/><span>{i.label}</span></NavLink>);
 const more=additional.filter(matches);
 const showProfile=()=>{setAccountOpen(false);setOpen(false);setProfileOpen(true);};
 return <div className={'bebfy-workspace bf-workspace bf-premium-shell bf-shell-v22 '+(isPdv?'bebfy-pdv-mode':'')}>
  {open&&<button type="button" tabIndex={-1} className="bf-mobile-backdrop" aria-label="Fechar navegação" onClick={()=>closeNav(true)}/>}
  <aside ref={sidebar} className={'bebfy-sidebar bf-sidebar '+(open?'bf-sidebar-open':'')} aria-label="Menu da distribuidora" id="bf-tenant-sidebar">
    <div className="bf-sidebar-brand"><Link to={tenantPath('dashboard')} aria-label="Bebfy, visão geral" onClick={()=>closeNav()}><BebfyBrand light compact/></Link><button type="button" className="bf-mobile-close" aria-label="Fechar menu" onClick={()=>closeNav(true)}><X size={20}/></button></div>
    <div className="bf-company"><Store size={22}/><div><strong title={empresa?.nomeFantasia}>{empresa?.nomeFantasia||'Distribuidora'}</strong><small title={empresa?.subdominio}>{empresa?.subdominio||'Empresa conectada'}</small></div></div>
    <div className="bf-nav-search"><Search size={15}/><input ref={searchRef} aria-label="Buscar tela no menu" placeholder="Buscar tela…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Limpar busca" onClick={()=>{setQuery('');searchRef.current?.focus();}}><X size={15}/></button>}</div>
    <nav className="bf-sidebar-nav" aria-label="Módulos disponíveis">
      {groups.map(group=>group.items.some(matches)&&<div key={group.label} className="bf-nav-category"><span>{group.label}</span><div>{links(group.items)}</div></div>)}
      {more.length>0&&<div className="bf-nav-category bf-nav-more"><button type="button" aria-expanded={Boolean(query)||moreOpen} aria-controls="bf-more-links" onClick={()=>setMoreOpen(v=>!v)}>Cadastros e opções <ChevronDown size={14}/></button><div id="bf-more-links" hidden={!query&&!moreOpen}>{links(more)}</div></div>}
      {secondary.some(matches)&&<div className="bf-nav-category bf-nav-secondary">{links(secondary)}</div>}
      {modulesStatus!=='ready'&&<div className="bf-menu-status" role="status">{modulesStatus==='error'?<>Não foi possível consultar módulos.<button type="button" onClick={()=>void refreshModules()}>Tentar novamente</button></>:'Carregando módulos…'}</div>}
      {modulesStatus==='ready'&&query&&!allItems.some(matches)&&<p className="bf-menu-status">Nenhuma tela disponível com esse nome.</p>}
    </nav>
    <div ref={accountRef} className="bf-sidebar-footer">
      {accountOpen&&<div className="bf-premium-account"><button type="button" onClick={showProfile}><UserRound size={16}/> Meu perfil</button><button type="button" onClick={()=>{logout();navigate(tenantPath(),{replace:true});}}><LogOut size={16}/> Sair do sistema</button></div>}
      <button type="button" className="bf-profile-button" aria-expanded={accountOpen} onClick={()=>setAccountOpen(v=>!v)}><span className="bf-avatar">{(user?.nome||'U')[0].toUpperCase()}</span><span className="bf-profile-name"><strong title={user?.nome}>{user?.nome||'Operador'}</strong><small>{roleLabels[user?.cargo||'']||'Minha conta'}</small></span><ChevronDown size={16}/></button>
    </div>
  </aside>
  <div className="bf-workarea">
    <header className="bf-topbar bf-shell-header"><div className="bf-topbar-title"><button ref={mobileButton} type="button" className="bf-mobile-open" aria-label="Abrir navegação" aria-controls="bf-tenant-sidebar" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={21}/></button><span className="bf-shell-context">Distribuidora</span><ChevronRight className="bf-shell-context" size={13}/><strong>{activeItem?.label||'Bebfy'}</strong></div><div className="bf-topbar-right"><Notificacoes/><button type="button" onClick={showProfile} aria-label="Meu perfil" title="Meu perfil"><UserRound size={17}/><span>Minha conta</span></button></div></header>
    <main className="bf-content" id="bf-main-content"><Outlet/></main>
  </div>
  <ProfileModal mode="tenant" open={profileOpen} onClose={()=>setProfileOpen(false)}/>
 </div>;
}
