import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, CalendarClock, CircleDollarSign, CreditCard, FileUp, Package, ShoppingCart, TrendingUp, Users, Wallet, AlertTriangle, Truck, RefreshCcw, CheckCircle2, WifiOff, Clock } from 'lucide-react';
import { bebfy } from '../services/bebfy';
import { tenantPath } from '../services/tenantUrls';
import { hasModule, routeModules } from '../services/moduleAccess';
import type { Dashboard as DashboardData, DashboardOperacional } from '../services/bebfy';
import { dinheiro, mensagemErro, Notice } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const palette=['#55d6a5','#639ef5','#ad91ed','#f0b65d','#e9829a'];
const paymentLabels:Record<string,string>={DINHEIRO:'Dinheiro',PIX:'Pix',CARTAO_DEBITO:'Débito',CARTAO_CREDITO:'Crédito',FIADO:'Fiado'};
const paymentColors:Record<string,string>={DINHEIRO:'#55d6a5',PIX:'#639ef5',CARTAO_DEBITO:'#ad91ed',CARTAO_CREDITO:'#f0b65d',FIADO:'#e9829a'};
const periods=[{id:'hoje',label:'Hoje'},{id:'7dias',label:'7 dias'},{id:'mes',label:'Este mês'}] as const;
const num=(v:unknown)=>Number(v)||0;
const compact=(v:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1,style:'currency',currency:'BRL'}).format(v);

export function Dashboard(){
 const {user,empresa,modules,modulesStatus}=useAuth();
 const manager=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'');
 const [params,setParams]=useSearchParams();
 const period=periods.find(p=>p.id===params.get('periodo'))?.id||'hoje';
 const periodLabel=periods.find(p=>p.id===period)?.label||'Hoje';
 const [dados,setDados]=useState<DashboardData|null>(null);
 const [operacional,setOperacional]=useState<DashboardOperacional|null>(null);
 const [loading,setLoading]=useState(true);
 const [erro,setErro]=useState('');
 const [updated,setUpdated]=useState<Date|null>(null);
 const [metric,setMetric]=useState<'faturamento'|'quantidade'>('faturamento');
 const [online,setOnline]=useState(navigator.onLine);
 const load=useCallback(async()=>{
   setLoading(true);setErro('');
   try{
     if(manager){setDados(await bebfy.dashboard());setOperacional(null);}
     else{setOperacional(await bebfy.dashboardOperacional());setDados(null);}
     setUpdated(new Date());
   }catch(e){setErro(mensagemErro(e));}finally{setLoading(false);}
 },[manager,empresa?.id,user?.id]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{const sync=()=>setOnline(navigator.onLine);window.addEventListener('online',sync);window.addEventListener('offline',sync);return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync);};},[]);
 const allowed=(to:string)=>modulesStatus==='ready'&&hasModule(modules,routeModules[to])&&(to!='/delivery'||hasModule(modules,'CAIXA_PDV'));
 const actions=[
   {to:'/pdv',name:'Nova venda',Icon:ShoppingCart,main:true},
   {to:'/caixas',name:'Controle de caixa',Icon:Wallet},
   {to:'/produtos',name:'Produtos',Icon:Package},
   {to:'/clientes',name:'Clientes',Icon:Users},
   {to:'/estoque',name:'Estoque',Icon:Boxes},
   {to:'/estoque/importar-xml',name:'Importar XML',Icon:FileUp,manager:true},
   {to:'/fiados',name:'Receber fiado',Icon:CreditCard,manager:true},
   {to:'/relatorios',name:'Relatórios',Icon:BarChart3,manager:true},
 ].filter(a=>allowed(a.to)&&(!a.manager||manager));
 const series=(period==='hoje'?dados?.vendasHorasHoje:period==='7dias'?dados?.vendasUltimos7Dias:dados?.vendasDiasMes)??[];
 const faturamento=period==='hoje'?num(dados?.faturamentoHoje):period==='mes'?num(dados?.faturamentoMes):series.reduce((a,d)=>a+num(d.faturamento),0);
 const quantidade=period==='hoje'?num(dados?.totalVendasHoje):period==='mes'?num(dados?.totalVendasMes):series.reduce((a,d)=>a+num(d.quantidade),0);
 const kpis=[
   {name:'Faturamento',value:dinheiro(faturamento),detail:'Vendas concluídas · '+periodLabel,Icon:CircleDollarSign,color:palette[0]},
   {name:'Vendas realizadas',value:String(quantidade),detail:'No período selecionado',Icon:ShoppingCart,color:palette[1]},
   {name:'Ticket médio',value:dinheiro(quantidade?faturamento/quantidade:0),detail:'Valor médio por venda',Icon:TrendingUp,color:palette[2]},
   {name:'Fiado a receber',value:dinheiro(dados?.totalFiadoAReceber),detail:(dados?.totalClientesDevedores??0)+' clientes devedores · saldo atual',Icon:CreditCard,color:palette[3]},
 ].filter(k=>k.name!=='Fiado a receber'||allowed('/fiados'));
 const max=Math.max(1,...series.map(d=>num(d[metric])));
 const axisMax=metric==='quantidade'?Math.max(4,Math.ceil(max/4)*4):Math.max(100,Math.ceil(max/100)*100);
 const payments=((period==='hoje'?dados?.pagamentosHoje:period==='7dias'?dados?.pagamentos7Dias:dados?.pagamentosMes)??[]).filter(p=>num(p.valor)>0);
 const paymentTotal=payments.reduce((sum,p)=>sum+num(p.valor),0);
 let offset=0;
 const segments=payments.map(p=>{const start=offset;offset+=num(p.valor)/paymentTotal*100;return (paymentColors[p.formaPagamento]||'#a1a1aa')+' '+start+'% '+offset+'%';});
 const top=dados?.topProdutosMaisVendidos??[];
 const topMax=Math.max(1,...top.map(p=>p.quantidadeVendida));
 const alertas=[
  {label:'Produtos com estoque baixo',value:manager?dados?.alertas?.estoqueBaixo:operacional?.estoqueBaixo,to:'/estoque',query:'?filtro=baixo',Icon:Boxes,color:'#f0b65d'},
  {label:'Lotes a vencer em até 30 dias',value:dados?.alertas?.lotesAVencer,to:'/lotes',query:'?filtro=avencer',Icon:CalendarClock,color:'#f0b65d'},
  {label:'Lotes vencidos',value:dados?.alertas?.lotesVencidos,to:'/lotes',query:'?filtro=vencidos',Icon:AlertTriangle,color:'#e9829a'},
  {label:'Entregas aguardando acerto',value:dados?.alertas?.entregasPendentes,to:'/delivery',query:'',Icon:Truck,color:'#639ef5'},
  {label:'Clientes com vasilhames',value:dados?.alertas?.clientesComVasilhames,to:'/vasilhames',query:'',Icon:Package,color:'#ad91ed'},
  {label:'Caixas abertos agora',value:manager?dados?.caixasAtivos?.length:undefined,to:'/caixas',query:'',Icon:Wallet,color:'#55d6a5'},
 ].filter(a=>a.value!=null&&allowed(a.to));
 const ready=manager?dados!==null:operacional!==null;
 return <div className="bf-dashboard bf-dashboard-v3">
   <div className="bf-overview-heading">
     <div><h1>Visão geral</h1><p>Olá, {user?.nome||'operador'}. Acompanhe {empresa?.nomeFantasia||'sua distribuidora'}.</p></div>
     <div className="bf-overview-controls">
       {manager&&<div role="group" aria-label="Período do dashboard" className="bf-overview-period">{periods.map(p=><button key={p.id} type="button" aria-pressed={period===p.id} onClick={()=>setParams(prev=>{const next=new URLSearchParams(prev);next.set('periodo',p.id);return next;},{replace:true})}>{p.label}</button>)}</div>}
       <button type="button" className="bf-overview-refresh" onClick={()=>void load()} disabled={loading} title="Atualizar indicadores" aria-label="Atualizar indicadores"><RefreshCcw size={17} className={loading?'animate-spin':''}/></button>
     </div>
   </div>
   <div className="bf-overview-status" role="status"><span className={!online||erro?'bf-status-error':''}>{!online||erro?<WifiOff size={13}/>:loading?<Clock size={13}/>:<CheckCircle2 size={13}/>} {!online?'Sem conexão de rede':erro?'Falha ao consultar servidor':loading?'Consultando dados…':'Dados consultados com sucesso'}</span>{updated&&<small>Última atualização: {updated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small>}</div>
   <Notice message={erro} onClose={()=>setErro('')}/>
   {ready&&manager&&<section className="bf-dash-kpis" aria-label="Indicadores principais">{kpis.map(({name,value,detail,Icon,color})=><article key={name} className="bf-dash-kpi"><span className="bf-overview-kpi-icon" style={{color,background:color+'18'}}><Icon size={19}/></span><div>{name}</div><strong>{value}</strong><small>{detail}</small></article>)}</section>}
   {ready&&!manager&&allowed('/caixas')&&<section className="bf-dash-kpis"><article className="bf-dash-kpi"><span className="bf-overview-kpi-icon" style={{color:'#55d6a5',background:'#55d6a518'}}><Wallet size={20}/></span><div>Meu caixa</div><strong>{operacional?.caixaAberto?'Aberto':'Fechado'}</strong><small>{operacional?.caixaAbertoEm?'Desde '+new Date(operacional.caixaAbertoEm).toLocaleString('pt-BR'):'Abra o caixa para iniciar vendas'}</small><Link className="bf-dash-link mt-2" to={tenantPath('pdv')}>Acessar PDV <ArrowRight size={14}/></Link></article></section>}
   <section className="bf-dash-quick"><div className="bf-dash-section-title"><h2>Acesso rápido</h2></div><div className="bf-dash-actions">{actions.map(({to,name,Icon,main})=><Link key={to} to={tenantPath(to)} className={'bf-dash-action '+(main?'bf-dash-primary':'')}><Icon size={17}/><span>{name}</span></Link>)}</div></section>
   {!ready&&<section className="bf-dash-panel bf-dash-empty">{loading?'Carregando indicadores…':'Não foi possível carregar o painel. Utilize o botão de atualização.'}</section>}
   {ready&&manager&&<>
    <div className="bf-dash-charts">
     <section className="bf-dash-panel"><div className="bf-dash-section-title"><div><h2>Desempenho de vendas</h2><small>{periodLabel} · vendas concluídas</small></div><div className="bf-dash-switch"><button type="button" aria-pressed={metric==='faturamento'} onClick={()=>setMetric('faturamento')}>R$</button><button type="button" aria-pressed={metric==='quantidade'} onClick={()=>setMetric('quantidade')}>Qtd.</button></div></div>
      <div className="bf-dash-chart-total"><strong>{metric==='faturamento'?dinheiro(faturamento):quantidade+' vendas'}</strong><small>no período</small></div>
      {series.length?<div className="bf-bar-chart" role="img" aria-label={series.map(d=>d.data+': '+(metric==='faturamento'?dinheiro(d.faturamento):d.quantidade+' vendas')).join('; ')}><div className="bf-chart-axis">{[1,.75,.5,.25,0].map(v=><span key={v}>{metric==='faturamento'?compact(axisMax*v):Math.round(axisMax*v)}</span>)}</div><div className="bf-bar-plot" style={{gridTemplateColumns:'repeat('+series.length+',minmax(0,1fr))'}}>{series.map((d,i)=><div className="bf-bar-column" key={d.data}><div className="bf-bar-track"><div className="bf-bar-value" style={{height:Math.max(num(d[metric])/axisMax*100,0)+'%',background:i===series.length-1?'#55d6a5':'#639ef5'}} title={d.data+': '+(metric==='faturamento'?dinheiro(d.faturamento):d.quantidade+' vendas')}/></div><span>{series.length>14&&i%5!==0&&i!==series.length-1?'':period==='hoje'?d.data:d.data.slice(8,10)+'/'+d.data.slice(5,7)}</span></div>)}</div></div>:<div className="bf-dash-empty">Série indisponível. Verifique se o backend está atualizado.</div>}
     </section>
     <section className="bf-dash-panel"><div className="bf-dash-section-title"><div><h2>Formas de pagamento</h2><small>{periodLabel} · líquido de troco</small></div></div>{paymentTotal>0?<div className="bf-donut-layout"><div className="bf-donut" role="img" aria-label={payments.map(p=>(paymentLabels[p.formaPagamento]||p.formaPagamento)+': '+dinheiro(p.valor)).join('; ')} style={{background:'conic-gradient('+segments.join(',')+')'}}><div><small>Total</small><strong>{compact(paymentTotal)}</strong></div></div><div className="bf-donut-legend">{payments.map(p=><div key={p.formaPagamento}><i style={{background:paymentColors[p.formaPagamento]||'#a1a1aa'}}/><span>{paymentLabels[p.formaPagamento]||p.formaPagamento}<small>{(p.valor/paymentTotal*100).toFixed(1).replace('.',',')}%</small></span><strong>{dinheiro(p.valor)}</strong></div>)}</div></div>:<div className="bf-dash-empty">Nenhum pagamento no período.</div>}<p className="bf-dash-note">Fiado é venda a prazo, não dinheiro recebido.</p></section>
    </div>
   </>}
   {ready&&<div className={manager?'bf-dash-bottom':'bf-overview-operational'}>
    {manager&&<section className="bf-dash-panel"><div className="bf-dash-section-title"><div><h2>Produtos mais vendidos</h2><small>Ranking histórico · quantidade registrada</small></div>{allowed('/relatorios')&&<Link to={tenantPath('relatorios')} className="bf-dash-link">Relatórios <ArrowRight size={14}/></Link>}</div>{top.length?<div className="bf-rank">{top.map((item,i)=><div key={item.produto?.id??i}><span className="bf-rank-index">{i+1}</span><div className="bf-rank-body"><strong>{item.produto?.nome||'Produto removido'}</strong><div className="bf-rank-track"><i style={{width:num(item.quantidadeVendida)/topMax*100+'%',background:palette[i%palette.length]}}/></div></div><div className="bf-rank-values"><strong>{item.quantidadeVendida} itens</strong><small>{dinheiro(item.totalArrecadado)}</small></div></div>)}</div>:<div className="bf-dash-empty">O ranking aparecerá após as primeiras vendas.</div>}</section>}
    <section className="bf-dash-panel"><div className="bf-dash-section-title"><div><h2>Atenção necessária</h2><small>Situação atual da operação</small></div></div><div className="bf-overview-alerts">{alertas.map(({label,value,to,query,Icon,color})=><Link key={label} to={tenantPath(to)+query}><Icon size={17} style={{color:value?color:'#858b96'}}/><span>{label}</span><strong style={{color:value?color:'#a7abb6'}}>{value}</strong><ArrowRight size={14}/></Link>)}{!alertas.length&&<p className="bf-dash-note">Sem indicadores disponíveis para este perfil.</p>}</div></section>
   </div>}
 </div>;
}
