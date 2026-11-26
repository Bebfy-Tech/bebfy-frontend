import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, CircleDollarSign, CreditCard, FileUp, Package, ShoppingCart, TrendingUp, Users, Wallet } from 'lucide-react';
import { bebfy } from '../services/bebfy';
import { tenantPath } from '../services/tenantUrls';
import { hasModule, routeModules } from '../services/moduleAccess';
import type { Dashboard as DashboardData } from '../services/bebfy';
import { card, dinheiro, mensagemErro, Notice, PageTitle } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const palette = ['#49cfa0','#639ef5','#f0b65d','#ad91ed','#e9829a'];
const paymentLabels:Record<string,string>={DINHEIRO:'Dinheiro',PIX:'Pix',CARTAO_DEBITO:'Débito',CARTAO_CREDITO:'Crédito',FIADO:'Fiado'};
const paymentColors:Record<string,string>={DINHEIRO:'#49cfa0',PIX:'#639ef5',CARTAO_DEBITO:'#b69af4',CARTAO_CREDITO:'#f3c369',FIADO:'#f28a9b'};
const number=(v:unknown)=>Number(v)||0;
const brlCompact=(v:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1,style:'currency',currency:'BRL'}).format(v);

export function Dashboard() {
  const { user, modules, modulesStatus } = useAuth();
  const [dados,setDados]=useState<DashboardData|null>(null);
  const [loading,setLoading]=useState(true);
  const [erro,setErro]=useState('');
  const [updated,setUpdated]=useState<Date|null>(null);
  const [metric,setMetric]=useState<'faturamento'|'quantidade'>('faturamento');
  const load=useCallback(async()=>{setLoading(true);setErro('');try{setDados(await bebfy.dashboard());setUpdated(new Date());}catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const manager=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'');
  const allowed=(to:string)=>modulesStatus==='ready'&&hasModule(modules,routeModules[to]);
  const kpis=[
    {name:'Faturamento hoje',value:dinheiro(dados?.faturamentoHoje),detail:'Vendas concluídas',Icon:CircleDollarSign,color:palette[0]},
    {name:'Vendas hoje',value:String(dados?.totalVendasHoje??0),detail:'Movimentos concluídos',Icon:ShoppingCart,color:palette[1]},
    {name:'Ticket médio',value:dinheiro(number(dados?.faturamentoHoje)/Math.max(1,number(dados?.totalVendasHoje))),detail:'Por venda hoje',Icon:TrendingUp,color:palette[3]},
    {name:'Fiado a receber',value:dinheiro(dados?.totalFiadoAReceber),detail:`${dados?.totalClientesDevedores??0} cliente(s) devedor(es)`,Icon:CreditCard,color:palette[2]},
  ].filter(k=>k.name!=='Fiado a receber'||allowed('/fiados'));
  const actions=[
    {to:'/pdv',name:'Nova venda',Icon:ShoppingCart,main:true},
    {to:'/caixas',name:'Controle de caixa',Icon:Wallet},
    {to:'/produtos',name:'Produtos',Icon:Package},
    {to:'/estoque',name:'Movimentar estoque',Icon:Boxes},
    {to:'/clientes',name:'Clientes',Icon:Users},
    {to:'/fiados',name:'Receber fiado',Icon:CreditCard},
    {to:'/estoque/importar-xml',name:'Importar XML',Icon:FileUp,manager:true},
    {to:'/relatorios',name:'Relatórios',Icon:BarChart3},
  ].filter(a=>allowed(a.to)&&(!a.manager||manager));
  const week=dados?.vendasUltimos7Dias??[];
  const max=Math.max(1,...week.map(d=>number(d[metric])));
  const axisMax=metric==='quantidade'?Math.max(4,Math.ceil(max/4)*4):Math.max(100,Math.ceil(max/100)*100);
  const payments=(dados?.pagamentosMes??[]).filter(p=>p.valor>0);
  const paymentTotal=payments.reduce((sum,p)=>sum+number(p.valor),0);
  let offset=0;
  const segments=payments.map(p=>{const start=offset;offset+=p.valor/paymentTotal*100;return `${paymentColors[p.formaPagamento]||'#a1a1aa'} ${start}% ${offset}%`;});
  const top=dados?.topProdutosMaisVendidos??[];
  const topMax=Math.max(1,...top.map(p=>p.quantidadeVendida));
  return <div className="bf-dashboard">
    <PageTitle title="Visão geral" subtitle={`Olá, ${user?.nome||'operador'}! Acompanhe sua distribuidora em um só lugar.`} onReload={()=>void load()} loading={loading}/>
    <Notice message={erro} onClose={()=>setErro('')}/>
    <section className="bf-dash-quick" aria-label="Ações rápidas">
      <div className="bf-dash-section-title"><h2>Acesso rápido</h2>{updated&&<small>Atualizado às {updated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small>}</div>
      <div className="bf-dash-actions">{actions.map(({to,name,Icon,main})=><Link key={to} to={tenantPath(to)} className={`bf-dash-action ${main?'bf-dash-primary':''}`}><Icon size={18}/><span>{name}</span></Link>)}</div>
    </section>
    {loading&&!dados?<div className={`${card} p-8 text-center`}>Carregando indicadores…</div>:!dados?<div className={`${card} p-8 text-center`}>Não foi possível carregar os indicadores. Use Atualizar para tentar novamente.</div>:<>
    <section className="bf-dash-kpis" aria-label="Indicadores de hoje">{kpis.map(({name,value,detail,Icon,color})=><article key={name} className="bf-dash-kpi" style={{borderTopColor:color}}><div><span>{name}</span><Icon size={20} color={color}/></div><strong>{value}</strong><small>{detail}</small></article>)}</section>
    <div className="bf-dash-charts">
      <section className="bf-dash-panel"><div className="bf-dash-section-title"><div><h2>Evolução das vendas</h2><small>Últimos 7 dias · vendas concluídas</small></div><div className="bf-dash-switch"><button type="button" aria-pressed={metric==='faturamento'} onClick={()=>setMetric('faturamento')}>R$</button><button type="button" aria-pressed={metric==='quantidade'} onClick={()=>setMetric('quantidade')}>Qtd.</button></div></div>
        <div className="bf-dash-chart-total"><strong>{metric==='faturamento'?dinheiro(week.reduce((a,d)=>a+number(d.faturamento),0)):week.reduce((a,d)=>a+number(d.quantidade),0)+' vendas'}</strong><small>no período</small></div>
        {week.length?<div className="bf-bar-chart" role="img" aria-label={week.map(d=>d.data+': '+(metric==='faturamento'?dinheiro(d.faturamento):d.quantidade+' vendas')).join('; ')}><div className="bf-chart-axis">{[1,.75,.5,.25,0].map(v=><span key={v}>{metric==='faturamento'?brlCompact(axisMax*v):Math.round(axisMax*v)}</span>)}</div><div className="bf-bar-plot">{week.map((d,i)=><div className="bf-bar-column" key={d.data}><div className="bf-bar-track"><div className="bf-bar-value" style={{height:Math.max(number(d[metric])/axisMax*100,0)+'%',background:i===week.length-1?'#49cfa0':'#639ef5'}} title={`${d.data}: ${metric==='faturamento'?dinheiro(d.faturamento):d.quantidade+' vendas'}`}/></div><span>{d.data.slice(8,10)}/{d.data.slice(5,7)}</span></div>)}</div></div>:<div className="bf-dash-empty">Histórico de vendas indisponível.</div>}
      </section>
      <section className="bf-dash-panel"><div className="bf-dash-section-title"><div><h2>Formas de pagamento</h2><small>Vendas concluídas neste mês · líquido de troco</small></div></div>
        {paymentTotal>0?<div className="bf-donut-layout"><div className="bf-donut" role="img" aria-label={payments.map(p=>paymentLabels[p.formaPagamento]+': '+dinheiro(p.valor)).join('; ')} style={{background:`conic-gradient(${segments.join(',')})`}}><div><small>Total</small><strong>{brlCompact(paymentTotal)}</strong></div></div><div className="bf-donut-legend">{payments.map(p=><div key={p.formaPagamento}><i style={{background:paymentColors[p.formaPagamento]||'#a1a1aa'}}/><span>{paymentLabels[p.formaPagamento]||p.formaPagamento}<small>{(p.valor/paymentTotal*100).toFixed(1).replace('.',',')}%</small></span><strong>{dinheiro(p.valor)}</strong></div>)}</div></div>:<div className="bf-dash-empty">{dados.pagamentosMes?'Nenhum pagamento registrado neste mês.':'Dados de pagamento indisponíveis.'}</div>}
        <p className="bf-dash-note">Fiado representa venda a prazo, não dinheiro recebido.</p>
      </section>
    </div>
    <div className="bf-dash-bottom">
      <section className="bf-dash-panel"><div className="bf-dash-section-title"><div><h2>Produtos mais vendidos</h2><small>Ranking histórico por quantidade registrada na venda</small></div>{allowed('/relatorios')&&<Link to={tenantPath('relatorios')} className="bf-dash-link">Relatórios <ArrowRight size={14}/></Link>}</div>
        {top.length?<div className="bf-rank">{top.map((item,i)=><div key={item.produto?.id??i}><span className="bf-rank-index">{i+1}</span><div className="bf-rank-body"><strong>{item.produto?.nome||'Produto removido'}</strong><div className="bf-rank-track"><i style={{width:number(item.quantidadeVendida)/topMax*100+'%',background:palette[i%palette.length]}}/></div></div><div className="bf-rank-values"><strong>{item.quantidadeVendida} itens</strong><small>{dinheiro(item.totalArrecadado)}</small></div></div>)}</div>:<div className="bf-dash-empty">O ranking aparecerá após as primeiras vendas.</div>}
      </section>
      <section className="bf-dash-panel"><div className="bf-dash-section-title"><h2>Resumo do mês</h2></div><div className="bf-month-summary"><div><small>Faturamento</small><strong>{dinheiro(dados.faturamentoMes)}</strong></div><div><small>Vendas concluídas</small><strong>{dados.totalVendasMes}</strong></div>{allowed('/caixas')&&<div><small>Caixas abertos agora</small><strong className="text-emerald-300">{dados.caixasAtivos?.length??0}</strong></div>}</div>{allowed('/caixas')&&<Link className="bf-dash-link" to={tenantPath('caixas')}>Ver controle de caixas <ArrowRight size={14}/></Link>}</section>
    </div>
    </>}
  </div>;
}
