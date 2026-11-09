import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, CreditCard, Package, ShoppingCart, Users, Wallet } from 'lucide-react';
import { bebfy } from '../services/bebfy';
import type { Dashboard as DashboardData } from '../services/bebfy';
import { card, dinheiro, mensagemErro, Notice, PageTitle } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard(){
  const {user,empresa}=useAuth();
  const [dados,setDados]=useState<DashboardData|null>(null);
  const [loading,setLoading]=useState(true);
  const [erro,setErro]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setErro('');
    try{setDados(await bebfy.dashboard());}
    catch(e){setErro(mensagemErro(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const cards=[
    {nome:'Faturamento de hoje',valor:dinheiro(dados?.faturamentoHoje),desc:`${dados?.totalVendasHoje??0} venda(s) no dia`,icone:Wallet},
    {nome:'Faturamento no mês',valor:dinheiro(dados?.faturamentoMes),desc:`${dados?.totalVendasMes??0} venda(s) no mês`,icone:BarChart3},
    {nome:'Fiado a receber',valor:dinheiro(dados?.totalFiadoAReceber),desc:`${dados?.totalClientesDevedores??0} cliente(s) devedores`,icone:CreditCard},
    {nome:'Caixas em operação',valor:String(dados?.caixasAtivos?.length??0),desc:'Turnos atualmente abertos',icone:ShoppingCart},
  ];
  return <>
    <PageTitle title="Visão geral" subtitle={`Bem-vindo, ${user?.nome||'operador'}! Acompanhe o movimento da ${empresa?.nomeFantasia||'sua distribuidora'}.`} onReload={()=>void load()} loading={loading}/>
    <Notice message={erro}/>
    {loading&&!dados?<div className={`${card} p-12 text-center text-sm text-slate-500`}>Carregando seu painel de indicadores...</div>:
      <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({nome,valor,desc,icone:Icon})=><article key={nome} className={`${card} p-5`}><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">{nome}</p><span className="rounded-xl bg-teal-50 p-2.5 text-teal-700"><Icon size={20}/></span></div><p className="mt-4 text-2xl font-black tracking-tight text-slate-900">{valor}</p><p className="mt-1 text-xs text-slate-500">{desc}</p></article>)}</section>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className={`${card} p-5 sm:p-6`}><div className="flex items-center justify-between"><h2 className="font-extrabold">Produtos mais vendidos</h2><Link to="/relatorios" className="flex items-center gap-1 text-xs font-bold text-teal-800">Mais detalhes <ArrowRight size={14}/></Link></div><p className="mt-1 text-xs text-slate-500">Ranking das vendas da distribuidora.</p><div className="mt-5 space-y-3">{dados?.topProdutosMaisVendidos.map((i,index)=><div key={i.produto?.id??index} className="flex items-center justify-between gap-3 rounded-xl bg-[#f5faf7] p-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-teal-700"><Package size={19}/></span><div className="min-w-0"><p className="truncate text-sm font-bold">{i.produto?.nome||'Produto removido'}</p><p className="text-xs text-slate-500">{i.quantidadeVendida} unidade(s)</p></div></div><strong className="shrink-0 text-sm">{dinheiro(i.totalArrecadado)}</strong></div>)}{!dados?.topProdutosMaisVendidos?.length&&<p className="py-10 text-center text-sm text-slate-500">Registre sua primeira venda para visualizar o ranking.</p>}</div></section>
        <section className={`${card} p-5 sm:p-6`}><h2 className="font-extrabold">Acesso rápido</h2><p className="mt-1 text-xs text-slate-500">Comece a operação em poucos cliques.</p><div className="mt-5 grid gap-3">{[
          {to:'/pdv',nome:'Abrir frente de caixa',descricao:'Vender e emitir comprovante interno',icone:ShoppingCart},
          {to:'/produtos',nome:'Gerenciar produtos',descricao:'Preços, cadastro e lotes',icone:Boxes},
          {to:'/clientes',nome:'Clientes',descricao:'Contatos, limite e saldo',icone:Users},
          {to:'/caixas',nome:'Movimentação de caixa',descricao:'Abertura, extrato e fechamento',icone:Wallet},
        ].map(({to,nome,descricao,icone:Icon})=><Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-teal-400 hover:bg-teal-50"><Icon className="shrink-0 text-teal-700" size={22}/><div className="flex-1"><strong className="text-sm">{nome}</strong><p className="text-xs text-slate-500">{descricao}</p></div><ArrowRight size={15} className="text-slate-400"/></Link>)}</div></section>
      </div>
      <section className={`${card} mt-5 p-5 sm:p-6`}><div className="flex items-center justify-between gap-3"><h2 className="font-extrabold">Turnos de caixa abertos</h2><Link to="/caixas" className="text-xs font-bold text-teal-700">Abrir controle de caixas</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{dados?.caixasAtivos?.map(c=><div key={c.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">● Caixa ativo</p><p className="mt-1 text-xs text-emerald-700">Saldo inicial {dinheiro(c.saldoInicial)}</p><p className="mt-1 text-xs text-emerald-600">Iniciado em {new Date(c.abertoEm).toLocaleString('pt-BR')}</p></div>)}{!dados?.caixasAtivos?.length&&<p className="py-6 text-sm text-slate-500">Nenhum caixa aberto no momento.</p>}</div></section>
      </>}
  </>;
}
