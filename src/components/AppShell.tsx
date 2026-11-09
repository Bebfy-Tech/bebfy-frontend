import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Boxes, Building2, ChevronRight, ClipboardList, CreditCard, FileBarChart, HandCoins, Layers3, LogOut, Menu, Package, ReceiptText, Settings, ShoppingCart, Truck, UserRound, Users, Wallet, Warehouse, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { ComponentType } from 'react';

type IconType = ComponentType<{ size?:number; className?:string }>;
type MenuItem={to:string;label:string;icon:IconType;manager?:boolean};
const groups:{title:string;items:MenuItem[]}[]=[
  { title:'OPERAÇÃO',items:[
    {to:'/dashboard',label:'Visão geral',icon:BarChart3},
    {to:'/pdv',label:'Frente de caixa / PDV',icon:ShoppingCart},
    {to:'/vendas',label:'Vendas e comprovantes',icon:ReceiptText},
    {to:'/caixas',label:'Controle de caixas',icon:Wallet},
    {to:'/delivery',label:'Entregas e acertos',icon:Truck},
  ]},
  { title:'GESTÃO',items:[
    {to:'/produtos',label:'Produtos',icon:Package},
    {to:'/categorias',label:'Categorias',icon:Layers3},
    {to:'/lotes',label:'Lotes e validade',icon:Boxes},
    {to:'/estoque',label:'Movimentações de estoque',icon:Warehouse},
    {to:'/clientes',label:'Clientes',icon:Users},
    {to:'/fiados',label:'Fiados e recebimentos',icon:HandCoins},
    {to:'/vasilhames',label:'Vasilhames',icon:ClipboardList},
    {to:'/fornecedores',label:'Fornecedores',icon:Building2},
  ]},
  { title:'ADMINISTRAÇÃO',items:[
    {to:'/financeiro',label:'Financeiro',icon:CreditCard,manager:true},
    {to:'/relatorios',label:'Relatórios',icon:FileBarChart},
    {to:'/funcionarios',label:'Funcionários e acessos',icon:UserRound,manager:true},
    {to:'/configuracoes',label:'Minha conta',icon:Settings},
  ]},
];
const managerRoles=['PROPRIETARIO','ADMINISTRADOR','GERENTE'];

export function AppShell() {
  const {user,empresa,logout}=useAuth();
  const navigate=useNavigate();
  const [open,setOpen]=useState(false);
  const manager=managerRoles.includes(user?.cargo||'');
  return <div className="min-h-screen bg-[#f3f7f5] text-slate-900">
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <Link to="/dashboard" className="flex items-center gap-2 text-xl font-black tracking-tight text-[#0d4945]"><Layers3 size={25}/> bebfy<span className="-ml-2 text-emerald-500">.</span></Link>
      <button type="button" onClick={()=>setOpen(!open)} aria-label="Abrir navegação" className="rounded-lg p-2 hover:bg-slate-100">{open?<X/>:<Menu/>}</button>
    </div>
    {open&&<button aria-label="Fechar navegação" className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={()=>setOpen(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[274px] flex-col overflow-y-auto border-r border-white/10 bg-[#09282d] text-white transition-transform lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
      <div className="border-b border-white/10 px-6 py-6"><Link to="/dashboard" onClick={()=>setOpen(false)} className="flex items-center gap-3 text-3xl font-black tracking-tight"><span className="rounded-xl bg-[#b1f3d5] p-2.5 text-[#06433d]"><Layers3 size={23}/></span>bebfy<span className="-ml-3 text-[#56d9ad]">.</span></Link><p className="ml-[57px] text-[10px] font-bold tracking-[.18em] text-emerald-300/70">PAINEL DA DISTRIBUIDORA</p></div>
      <div className="m-4 rounded-xl border border-emerald-400/15 bg-white/5 p-3.5"><div className="flex items-center gap-2"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300/15 text-emerald-300"><Building2 size={21}/></span><div className="min-w-0"><strong className="block truncate text-sm">{empresa?.nomeFantasia||'Distribuidora'}</strong><span className="block truncate text-[11px] text-slate-400">{empresa?.subdominio||'Sua empresa'}</span></div></div></div>
      <nav aria-label="Menu da distribuidora" className="flex-1 px-3 pb-6">{groups.map(group=><section key={group.title} className="mt-5"><p className="px-3 pb-2 text-[10px] font-black tracking-[.18em] text-slate-500">{group.title}</p>{group.items.filter(i=>!i.manager||manager).map(i=><NavLink key={i.to} to={i.to} onClick={()=>setOpen(false)} className={({isActive})=>`my-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors ${isActive?'bg-emerald-300/15 text-emerald-200':'text-slate-300 hover:bg-white/5 hover:text-white'}`}><i.icon size={18}/><span className="flex-1">{i.label}</span><ChevronRight size={13} className="opacity-40"/></NavLink>)}</section>)}</nav>
      <div className="border-t border-white/10 p-4"><div className="mb-3 flex items-center gap-3 px-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-200/15 font-black text-emerald-200">{(user?.nome||'U')[0]}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.nome}</p><p className="text-[11px] text-slate-400">{user?.cargo?.replaceAll('_',' ')}</p></div></div><button onClick={()=>{logout();navigate('/login',{replace:true})}} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10"><LogOut size={17}/> Sair do sistema</button></div>
    </aside>
    <div className="min-w-0 lg:ml-[274px]"><header className="hidden items-center justify-between gap-4 border-b border-slate-200 bg-white px-7 py-4 lg:flex"><div className="flex items-center gap-2 text-xs font-bold tracking-wider text-teal-700"><span className="h-2 w-2 rounded-full bg-emerald-500"/> BEBFY OPERACIONAL</div><div className="flex items-center gap-3 text-sm text-slate-600"><span>{empresa?.nomeFantasia}</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800">{user?.nome}</span></div></header><div className="mx-auto max-w-[1540px] p-4 sm:p-6 xl:p-8"><Outlet/></div><footer className="py-6 text-center text-xs text-slate-400">Bebfy · Gestão de distribuidoras · Comprovantes não fiscais</footer></div>
  </div>;
}
