import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Boxes, CircleDollarSign, CreditCard, FileBarChart, Wallet } from 'lucide-react';
import { bebfy } from '../services/bebfy';
import { tenantPath } from '../services/tenantUrls';
import type { Dashboard } from '../services/bebfy';
import { card, dinheiro, Empty, mensagemErro, Notice, PageTitle } from '../components/ui';

export function RelatoriosPage(){
  const [dados,setDados]=useState<Dashboard|null>(null);
  const [loading,setLoading]=useState(true);
  const [erro,setErro]=useState('');
  const load=useCallback(async()=>{setLoading(true);setErro('');try{setDados(await bebfy.dashboard());}catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const ranking=useMemo(()=>dados?.topProdutosMaisVendidos??[],[dados]);
  const maximo=Math.max(1,...ranking.map(x=>Number(x.quantidadeVendida)));
  const cards=[
    {title:'Faturamento de hoje',value:dinheiro(dados?.faturamentoHoje),desc:`${dados?.totalVendasHoje??0} venda(s) hoje`,icon:CircleDollarSign},
    {title:'Faturamento do mês',value:dinheiro(dados?.faturamentoMes),desc:`${dados?.totalVendasMes??0} venda(s) no mês`,icon:BarChart3},
    {title:'Fiado a receber',value:dinheiro(dados?.totalFiadoAReceber),desc:'Saldo de clientes',icon:CreditCard},
    {title:'Caixas ativos',value:String(dados?.caixasAtivos?.length??0),desc:'Turnos em operação',icon:Wallet},
  ];
  return <>
    <PageTitle title="Relatórios e indicadores" subtitle="Acompanhe resultados e produtos mais vendidos, calculados pelo backend." onReload={()=>void load()} loading={loading}/>
    <Notice message={erro}/>
    {loading&&!dados?<div className={`${card} p-10 text-center text-slate-500`}>Carregando indicadores...</div>:<>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({title,value,desc,icon:Icon})=><div key={title} className={`${card} p-5`}><div className="flex items-center justify-between text-sm text-slate-500"><span>{title}</span><Icon size={21} className="text-teal-700"/></div><strong className="mt-4 block text-2xl font-black text-slate-900">{value}</strong><p className="mt-1 text-xs text-slate-500">{desc}</p></div>)}</section>
      <div className="mt-6 grid gap-5 xl:grid-cols-5">
        <section className={`${card} p-5 sm:p-6 xl:col-span-3`}><h2 className="flex items-center gap-2 font-extrabold"><FileBarChart size={21} className="text-teal-700"/> Ranking de produtos</h2><p className="mt-1 text-xs text-slate-500">Volume de unidades vendidas no período calculado pela API.</p>
          <div className="mt-6 space-y-5">{ranking.map((r,i)=><div key={r.produto?.id??i}><div className="mb-2 flex items-center justify-between gap-4 text-sm"><div className="min-w-0"><strong className="truncate">{r.produto?.nome??'Produto removido'}</strong><span className="ml-2 text-xs text-slate-400">{r.quantidadeVendida} un.</span></div><span className="shrink-0 font-bold text-teal-800">{dinheiro(r.totalArrecadado)}</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#0b655c] to-emerald-400" style={{width:`${Number(r.quantidadeVendida)/maximo*100}%`}}/></div></div>)}{!ranking.length&&<Empty>Nenhuma venda registrada para gerar ranking.</Empty>}</div>
        </section>
        <section className={`${card} p-5 sm:p-6 xl:col-span-2`}><h2 className="mb-4 font-extrabold">Atalhos de gestão</h2><div className="space-y-3">{[{to:'/vendas',title:'Histórico de vendas',desc:'Consulte comprovantes e cancelamentos',icon:FileBarChart},{to:'/estoque',title:'Posição de estoque',desc:'Saldo e movimentações de produtos',icon:Boxes},{to:'/fiados',title:'Valores em aberto',desc:'Consulte clientes devedores',icon:CreditCard},{to:'/caixas',title:'Extratos de caixa',desc:'Confira aberturas, retiradas e fechamento',icon:Wallet}].map(({to,title,desc,icon:Icon})=><Link key={to} to={tenantPath(to)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-teal-400 hover:bg-teal-50"><Icon size={22} className="shrink-0 text-teal-700"/><div><strong className="text-sm">{title}</strong><p className="mt-1 text-xs text-slate-500">{desc}</p></div></Link>)}</div></section>
      </div>
      <p className="mt-5 text-xs text-slate-500">Este relatório exibe os indicadores expostos em GET /relatorios/dashboard. Gráficos históricos por dia, exportação CSV e relatórios contábeis ainda requerem endpoints específicos.</p>
    </>}
  </>;
}
