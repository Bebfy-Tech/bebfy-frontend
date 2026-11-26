import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, Calendar, CalendarClock, CircleDollarSign, CreditCard, FileUp, Home, Package, ShoppingCart, TrendingUp, Users, Wallet, AlertTriangle, Truck, RefreshCcw, CheckCircle2, WifiOff, Clock, Trophy, UserRound, Layers3 } from 'lucide-react';
import { bebfy } from '../services/bebfy';
import { tenantPath } from '../services/tenantUrls';
import { hasModule, routeModules } from '../services/moduleAccess';
import type { Dashboard as DashboardData, DashboardOperacional, Venda, Cliente } from '../services/bebfy';
import { dinheiro, mensagemErro, Notice } from '../components/ui';
import { ProdutoFoto } from '../components/ProdutoFoto';
import { useAuth } from '../contexts/AuthContext';

const periods=[{id:'hoje',label:'Hoje'},{id:'7dias',label:'7 dias'},{id:'mes',label:'Este mês'}] as const;
type Period=typeof periods[number]['id'];
type Metric='faturamento'|'quantidade'|'ticket';
type Point={label:string;faturamento:number;quantidade:number};
const colors=['#00dc83','#2c8cff','#a84cff','#ffc348'];
const payMeta:Record<string,{label:string;color:string}>={PIX:{label:'Pix',color:'#288bff'},DINHEIRO:{label:'Dinheiro',color:'#00dc54'},CARTAO_DEBITO:{label:'Débito',color:'#9145f5'},CARTAO_CREDITO:{label:'Crédito',color:'#ffc648'},FIADO:{label:'Fiado',color:'#fb527c'}};
const n=(v:unknown)=>Number(v)||0;
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);
const short=(v:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1,style:'currency',currency:'BRL'}).format(v);
const day=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const shift=(d:Date,k:number)=>{const x=new Date(d);x.setDate(x.getDate()+k);return x;};
const range=(period:Period,now:Date)=>{
 const today=day(now),end=shift(today,1);
 const start=period==='hoje'?today:period==='7dias'?shift(today,-6):new Date(today.getFullYear(),today.getMonth(),1);
 const prevStart=period==='mes'?new Date(today.getFullYear(),today.getMonth()-1,1):shift(start,period==='hoje'?-1:-7);
 const prevEnd=period==='mes'?start:shift(end,period==='hoje'?-1:-7);
 return {start,end,prevStart,prevEnd,today};
};
const between=(v:{criadoEm?:string},a:Date,b:Date)=>{const t=new Date(v.criadoEm||'').getTime();return t>=a.getTime()&&t<b.getTime();};
const sum=(v:Venda[])=>v.reduce((s,x)=>s+n(x.valorTotal),0);
const metricValue=(p:Point,m:Metric)=>m==='ticket'?(p.quantidade?p.faturamento/p.quantidade:0):p[m];
function bucket(sales:Venda[],start:Date,end:Date,hourly:boolean):Point[]{
 const out:Point[]=[];
 for(let d=new Date(start);d<end;){
   const next=hourly?new Date(d.getTime()+7200000):shift(d,1);
   const items=sales.filter(v=>between(v,d,next));
   out.push({label:hourly?String(d.getHours()).padStart(2,'0')+'h':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),faturamento:sum(items),quantidade:items.length});
   d=next;
 }
 return out;
}
function Spark({values,color}:{values:number[];color:string}){
 const max=Math.max(1,...values),pts=values.map((v,i)=>(i*80/Math.max(1,values.length-1))+','+(30-v/max*25)).join(' ');
 return <svg viewBox="0 0 80 35" aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/></svg>;
}
function SalesChart({series,previous,metric}:{series:Point[];previous:Point[];metric:Metric}){
 const [hover,setHover]=useState<number|null>(null);
 const points=series.map(p=>metricValue(p,metric)),prev=previous.map(p=>metricValue(p,metric));
 const peak=Math.max(1,...points,...prev),max=metric==='quantidade'?Math.max(4,Math.ceil(peak/4)*4):Math.ceil(peak/Math.pow(10,Math.floor(Math.log10(peak))))*Math.pow(10,Math.floor(Math.log10(peak)));
 const x=(i:number)=>52+i*482/Math.max(1,series.length-1),y=(v:number)=>142-v/max*122;
 const line=(values:number[])=>values.slice(0,series.length).map((v,i)=>x(i)+','+y(v)).join(' ');
 const active=hover===null?null:series[hover];
 return <div className="bf-p-chart" onMouseLeave={()=>setHover(null)}>
  <svg viewBox="0 0 550 168" role="img" aria-label={'Desempenho: '+series.map(p=>p.label+' '+(metric==='quantidade'?p.quantidade:dinheiro(metricValue(p,metric)))).join('; ')}>
   <defs><linearGradient id="bf-premium-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#00df83" stopOpacity=".25"/><stop offset="100%" stopColor="#00df83" stopOpacity="0"/></linearGradient></defs>
   {[0,1,2,3,4].map(i=><g key={i}><line x1="52" x2="534" y1={y(max*i/4)} y2={y(max*i/4)} stroke="#333b43" strokeDasharray="3 4"/><text x="45" y={y(max*i/4)+3} fill="#bdc4cd" fontSize="10" textAnchor="end">{metric==='quantidade'?Math.round(max*i/4):short(max*i/4)}</text></g>)}
   {points.length>0&&<path d={'M '+x(0)+' 142 L '+line(points).replaceAll(' ',' L ')+' L '+x(points.length-1)+' 142 Z'} fill="url(#bf-premium-chart-fill)"/>}
   {prev.length>0&&<polyline points={line(prev)} stroke="#63717a" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity=".7"/>}
   <polyline points={line(points)} stroke="#00e58b" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
   {series.map((p,i)=><g key={p.label}>{(series.length<=14||i%5===0||i===series.length-1)&&<text x={x(i)} y="160" fill="#b8c0ca" fontSize="10" textAnchor="middle">{p.label}</text>}<circle cx={x(i)} cy={y(points[i])} r={hover===i?4.7:2.5} fill="#f0fff8" stroke="#00dd83" strokeWidth="1.6"/><rect x={x(i)-Math.max(7,482/Math.max(1,series.length)/2)} y="8" width={Math.max(14,482/Math.max(1,series.length))} height="138" fill="transparent" onMouseEnter={()=>setHover(i)}><title>{p.label}: {metric==='quantidade'?p.quantidade:dinheiro(points[i])}</title></rect></g>)}
   {hover!==null&&active&&<line x1={x(hover)} x2={x(hover)} y1="10" y2="142" stroke="#c8e4d5" strokeDasharray="3 4" opacity=".55" pointerEvents="none"/>}
  </svg>
  {active&&<div className="bf-p-tooltip" style={{left:Math.min(78,Math.max(12,(hover||0)/Math.max(1,series.length-1)*84))+'%'}}><small>{active.label}</small><strong>{metric==='quantidade'?active.quantidade+' vendas':dinheiro(metricValue(active,metric))}</strong><small>{active.quantidade} vendas</small></div>}
 </div>;
}
export function Dashboard(){
 const {user,empresa,modules,modulesStatus}=useAuth();
 const manager=['PROPRIETARIO','ADMINISTRADOR','GERENTE'].includes(user?.cargo||'');
 const [params,setParams]=useSearchParams();
 const storageKey='bebfy:dashboard:periodo:'+empresa?.id+':'+user?.id;
 const period=periods.find(p=>p.id===params.get('periodo'))?.id||periods.find(p=>p.id===sessionStorage.getItem(storageKey))?.id||'hoje';
 const periodLabel=periods.find(p=>p.id===period)?.label||'Hoje';
 const [data,setData]=useState<DashboardData|null>(null);
 const [operacional,setOperacional]=useState<DashboardOperacional|null>(null);
 const [sales,setSales]=useState<Venda[]|null>(null);
 const [clients,setClients]=useState<Cliente[]|null>(null);
 const [cash,setCash]=useState<{id:string;saldo:number}|null>(null);
 const [loading,setLoading]=useState(true);const [erro,setErro]=useState('');
 const [updated,setUpdated]=useState<Date|null>(null);const [online,setOnline]=useState(navigator.onLine);
 const [metric,setMetric]=useState<Metric>('faturamento');
 const inflight=useRef(false);const generation=useRef(0);
 const pdvEnabled=hasModule(modules,'CAIXA_PDV')&&modulesStatus==='ready';
 const allowed=(to:string)=>modulesStatus==='ready'&&hasModule(modules,routeModules[to])&&(to!='/delivery'||pdvEnabled);
 const load=useCallback(async()=>{
   if(inflight.current||modulesStatus!=='ready')return;
   inflight.current=true;const epoch=generation.current;setLoading(true);
   try{
     if(manager){
       const dashboard=await bebfy.dashboard();
       if(epoch!==generation.current)return;
       setData(dashboard);setOperacional(null);setErro('');setUpdated(new Date());
       // Existing authenticated APIs provide the historical comparison, not mock values.
       const own=dashboard.caixasAtivos.find(c=>c.operadorId===user?.funcionarioId)||dashboard.caixasAtivos[0];
       const [history,customers,statement]=await Promise.allSettled([
         pdvEnabled?bebfy.vendas.listar():Promise.resolve(null),
         bebfy.clientes.listar(),
         pdvEnabled&&own?bebfy.caixa.extrato(own.id):Promise.resolve(null),
       ]);
       if(epoch!==generation.current)return;
       setSales(history.status==='fulfilled'?history.value:null);
       setClients(customers.status==='fulfilled'?customers.value:null);
       setCash(own&&statement.status==='fulfilled'&&statement.value?.saldoParcialSistema!=null?{id:own.id,saldo:n(statement.value.saldoParcialSistema)}:null);
     }else{
       const op=await bebfy.dashboardOperacional();if(epoch!==generation.current)return;
       setOperacional(op);setData(null);setSales(null);setClients(null);setCash(null);setErro('');setUpdated(new Date());
     }
   }catch(e){if(epoch===generation.current)setErro(mensagemErro(e));}finally{if(epoch===generation.current){inflight.current=false;setLoading(false);}}
 },[manager,empresa?.id,user?.funcionarioId,modulesStatus,pdvEnabled]);
 useEffect(()=>{generation.current++;inflight.current=false;setData(null);setOperacional(null);setSales(null);setClients(null);setCash(null);setUpdated(null);void load();const timer=window.setInterval(()=>{if(!document.hidden&&navigator.onLine)void load();},30000);return()=>{generation.current++;inflight.current=false;window.clearInterval(timer);};},[load]);
 useEffect(()=>{const sync=()=>setOnline(navigator.onLine);window.addEventListener('online',sync);window.addEventListener('offline',sync);return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync);};},[]);
 const selectPeriod=(p:Period)=>{sessionStorage.setItem(storageKey,p);setParams(prev=>{const next=new URLSearchParams(prev);next.set('periodo',p);return next;},{replace:true});};
 const dates=range(period,updated||new Date());
 const completed=sales?.filter(v=>v.status==='CONCLUIDA')??null;
 const current=completed?.filter(v=>between(v,dates.start,dates.end))??null;
 const earlier=completed?.filter(v=>between(v,dates.prevStart,dates.prevEnd))??null;
 const daily=completed?.filter(v=>between(v,dates.today,shift(dates.today,1)))??null;
 const fallbackSeries=(period==='hoje'?data?.vendasHorasHoje:period==='7dias'?data?.vendasUltimos7Dias:data?.vendasDiasMes)??[];
 const series=current?bucket(current,dates.start,dates.end,period==='hoje'):fallbackSeries.map(p=>({label:period==='hoje'?p.data:p.data.slice(8,10)+'/'+p.data.slice(5,7),faturamento:p.faturamento,quantidade:p.quantidade}));
 const previous=earlier?bucket(earlier,dates.prevStart,dates.prevEnd,period==='hoje'):[];
 const revenue=current?sum(current):series.reduce((s,p)=>s+n(p.faturamento),0);
 const count=current?current.length:series.reduce((s,p)=>s+n(p.quantidade),0);
 const ticket=count?revenue/count:0,prevRevenue=earlier?sum(earlier):null,prevCount=earlier?.length??null,prevTicket=prevCount&&prevRevenue!==null?prevRevenue/prevCount:0;
 const compareLabel=period==='hoje'?'ontem':period==='7dias'?'7 dias anteriores':'mês anterior';
 const pct=(v:number,p:number|null)=>p===null||p===0?null:(v-p)/p*100;
 const deltaText=(v:number|null)=>v===null?'Sem base de comparação':(v>=0?'+':'')+fmt(v)+'%';
 const cards=[
  {name:'Faturamento',value:dinheiro(revenue),Icon:CircleDollarSign,color:colors[0],detail:'em relação a '+compareLabel,delta:pct(revenue,prevRevenue),trend:series.map(p=>p.faturamento)},
  {name:'Vendas realizadas',value:String(count),Icon:ShoppingCart,color:colors[1],detail:'em relação a '+compareLabel,delta:pct(count,prevCount),trend:series.map(p=>p.quantidade)},
  {name:'Ticket médio',value:dinheiro(ticket),Icon:BarChart3,color:colors[2],detail:'em relação a '+compareLabel,delta:pct(ticket,prevCount===null?null:prevTicket),trend:series.map(p=>metricValue(p,'ticket'))},
  {name:'Fiado a receber',value:dinheiro(data?.totalFiadoAReceber),Icon:CreditCard,color:colors[3],detail:(data?.totalClientesDevedores??0)+' clientes devedores',delta:null,trend:[] as number[]},
 ].filter(c=>c.name!=='Fiado a receber'||allowed('/fiados'));
 const quick=[{to:'/pdv',label:'Nova venda (PDV)',Icon:ShoppingCart},{to:'/caixas',label:'Controle de caixa',Icon:Wallet},{to:'/produtos',label:'Produtos',Icon:Package},{to:'/clientes',label:'Clientes',Icon:Users},{to:'/estoque',label:'Estoque',Icon:Layers3},{to:'/estoque/importar-xml',label:'Importar XML',Icon:FileUp,manager:true}].filter(i=>allowed(i.to)&&(!i.manager||manager));
 const paymentRows=(period==='hoje'?data?.pagamentosHoje:period==='7dias'?data?.pagamentos7Dias:data?.pagamentosMes)??[];
 const paymentMap:Record<string,number>={};if(current){for(const v of current)for(const p of v.pagamentos)paymentMap[p.formaPagamento]=(paymentMap[p.formaPagamento]||0)+n(p.valor)-n(p.troco);}else{for(const p of paymentRows)paymentMap[p.formaPagamento]=n(p.valor);}
 const payments=Object.entries(payMeta).filter(([key])=>key!=='FIADO'||allowed('/fiados')).map(([key,meta])=>({...meta,value:paymentMap[key]||0})).filter(p=>p.value>0);
 const paymentTotal=payments.reduce((s,p)=>s+p.value,0);let offset=0;
 const segments=payments.map(p=>{const start=offset;offset+=p.value/paymentTotal*100;return p.color+' '+start+'% '+offset+'%';});
 const ranked=new Map<number,{id:number;name:string;qty:number}>();
 if(current)for(const v of current)for(const i of v.itens){const old=ranked.get(i.produtoId)||{id:i.produtoId,name:i.produto?.nome||'Produto #'+i.produtoId,qty:0};old.qty+=i.unidadesEstoque??i.quantidade;ranked.set(i.produtoId,old);}
 const rankedTotal=[...ranked.values()].reduce((s,p)=>s+p.qty,0);
 const top=current?[...ranked.values()].sort((a,b)=>b.qty-a.qty).slice(0,5):(data?.topProdutosMaisVendidos??[]).filter(p=>p.produto).map(p=>({id:p.produto!.id,name:p.produto!.nome,qty:p.quantidadeVendida}));
 const alerts=[
  {label:'Lotes vencidos',desc:'Produtos fora da validade.',value:data?.alertas?.lotesVencidos,Icon:AlertTriangle,color:'#ff526a',to:'/lotes?filtro=vencidos'},
  {label:'Produtos com estoque baixo',desc:'Reposição recomendada.',value:manager?data?.alertas?.estoqueBaixo:operacional?.estoqueBaixo,Icon:Package,color:'#ffc348',to:'/estoque?filtro=baixo'},
  {label:'Produtos próximos do vencimento',desc:'Vencem nos próximos 30 dias.',value:data?.alertas?.lotesAVencer,Icon:CalendarClock,color:'#ffc348',to:'/lotes?filtro=avencer'},
  {label:'Entregas aguardando acerto',desc:'Vendas pendentes de conferência.',value:data?.alertas?.entregasPendentes,Icon:Truck,color:'#2c8cff',to:'/delivery'},
  {label:'Clientes com vasilhames',desc:'Controle de retornáveis.',value:data?.alertas?.clientesComVasilhames,Icon:Boxes,color:'#ac75ff',to:'/vasilhames'},
 ].filter(a=>a.value!=null&&allowed(a.to.split('?')[0]));
 const ready=manager?data!==null:operacional!==null;
 const own=data?.caixasAtivos.find(c=>c.operadorId===user?.funcionarioId)||data?.caixasAtivos[0];
 const comparison=pct(revenue,prevRevenue);
 const dayLabel=dates.start.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+(period==='hoje'?'':' – '+shift(dates.end,-1).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}));
 return <div className="bf-premium-dashboard">
  <header className="bf-p-heading"><div className="bf-p-heading-title"><span className="bf-p-icon green"><Home size={24}/></span><div><h1>Visão Geral</h1><p>Acompanhe os resultados da sua distribuidora em tempo real.</p></div></div><div className="bf-p-controls">{manager&&<><div className="bf-p-date"><Calendar size={19}/><span><small>Período</small><strong>{dayLabel}</strong></span></div><div className="bf-p-period" role="group" aria-label="Período">{periods.map(p=><button key={p.id} aria-pressed={p.id===period} onClick={()=>selectPeriod(p.id)}>{p.label}</button>)}</div></>}<button type="button" title="Atualizar agora" onClick={()=>void load()} disabled={loading} className="bf-p-refresh">{online&&!erro?<RefreshCcw size={15} className={loading?'animate-spin':''}/>:<WifiOff size={15}/>}<span>{!online?'Sem rede':erro?'Falha na consulta':loading?'Atualizando…':'Atualiza em 30s'}</span><i style={{background:!online||erro?'#ff526a':'#00dc83'}}/></button></div></header>
  <Notice message={erro}/>
  {!ready&&<div className="bf-p-kpis" aria-busy={loading}>{[0,1,2,3].map(i=><div className="bf-p-panel bf-p-skeleton" key={i}>{loading?'Carregando…':'Dados indisponíveis'}</div>)}</div>}
  {ready&&manager&&<div className="bf-p-kpis">{cards.map(c=><article className="bf-p-kpi" key={c.name} style={{borderColor:c.color+'32',background:'linear-gradient(120deg,'+c.color+'0b,#0d1217 80%)'}}><div className="bf-p-kpi-label"><span className="bf-p-icon" style={{color:c.color,background:c.color+'19'}}><c.Icon size={21}/></span><strong>{c.name}</strong></div><div className="bf-p-kpi-value"><b>{c.value}</b>{c.trend.length>0&&<Spark values={c.trend} color={c.color}/>}</div><div className="bf-p-kpi-detail">{c.name==='Fiado a receber'?<><Users size={15} style={{color:c.color}}/>{c.detail}</>:<><span className={c.delta===null?'bf-p-neutral':c.delta>=0?'bf-p-positive':'bf-p-negative'}>{deltaText(c.delta)}</span>{c.delta!==null&&<small>{c.detail}</small>}</>}</div></article>)}</div>}
  <div className="bf-p-quick">{quick.map(q=><Link key={q.to} to={tenantPath(q.to)} className={q.to==='/pdv'?'bf-p-action primary':'bf-p-action'}><q.Icon size={19}/>{q.label}</Link>)}</div>
  {ready&&manager&&<div className="bf-p-layout">
   <div className="bf-p-main">
    <div className="bf-p-upper">
     <section className="bf-p-panel bf-p-sales"><div className="bf-p-panel-heading"><span className="bf-p-icon green"><TrendingUp size={20}/></span><div><h2>Desempenho de vendas</h2><p>Faturamento no período: <b>{dinheiro(revenue)}</b></p></div></div><div className="bf-p-chart-tabs" role="group" aria-label="Métrica">{([{key:'faturamento',label:'Faturamento'},{key:'quantidade',label:'Vendas'},{key:'ticket',label:'Ticket médio'}] as const).map(m=><button key={m.key} aria-pressed={metric===m.key} onClick={()=>setMetric(m.key)}>{m.label}</button>)}</div>{series.length>0?<SalesChart series={series} previous={previous} metric={metric}/>:<p className="bf-p-empty">Sem série disponível.</p>}<div className="bf-p-chart-legend"><span><i style={{background:'#00dc83'}}/>{periodLabel} ({metric==='quantidade'?count:dinheiro(metric==='ticket'?ticket:revenue)})</span>{earlier&&<span><i style={{background:'#63717a'}}/>{compareLabel} ({metric==='quantidade'?prevCount:dinheiro(metric==='ticket'?prevTicket:prevRevenue)})</span>}</div></section>
     <section className="bf-p-panel"><div className="bf-p-panel-heading"><span className="bf-p-icon green"><CreditCard size={20}/></span><div><h2>Formas de pagamento</h2><p>Distribuição do faturamento</p></div></div><div className="bf-p-payment-body"><div className="bf-p-donut" style={{background:paymentTotal?'conic-gradient('+segments.join(',')+')':'#283038'}}><div><small>Total</small><strong>{dinheiro(paymentTotal)}</strong></div></div><div className="bf-p-payment-legend">{payments.length?payments.map(p=><div key={p.label}><i style={{background:p.color}}/><span>{p.label}</span><b>{fmt(p.value/paymentTotal*100)}%</b><strong>{dinheiro(p.value)}</strong></div>):<p className="bf-p-empty">Sem pagamentos no período.</p>}</div></div></section>
    </div>
    <div className="bf-p-lower">
     <section className="bf-p-panel"><div className="bf-p-panel-heading"><span className="bf-p-icon amber"><Trophy size={20}/></span><div><h2>Produtos mais vendidos</h2><p>{current?'No período selecionado':'Ranking histórico'}</p></div>{allowed('/relatorios')&&<Link className="bf-p-small-link" to={tenantPath('relatorios')}>Ver ranking <ArrowRight size={13}/></Link>}</div><div className="bf-p-rank">{top.length?top.map(p=><div key={p.id}><ProdutoFoto produtoId={String(p.id)} editable={false}/><span title={p.name}>{p.name}</span><div className="bf-p-rank-bar"><i style={{width:(p.qty/Math.max(1,...top.map(x=>x.qty))*100)+'%'}}/></div><b>{p.qty} un.</b>{rankedTotal>0&&<small>{fmt(p.qty/rankedTotal*100)}%</small>}</div>):<p className="bf-p-empty">Nenhum produto vendido no período.</p>}</div></section>
     <section className="bf-p-panel"><div className="bf-p-panel-heading"><span className="bf-p-icon amber"><AlertTriangle size={20}/></span><div><h2>Pendências operacionais</h2><p>Prioridades da distribuidora</p></div></div><div className="bf-p-alerts">{alerts.filter(a=>n(a.value)>0).map(a=><Link key={a.label} to={tenantPath(a.to)}><span className="bf-p-icon" style={{color:a.color,background:a.color+'20'}}><a.Icon size={18}/></span><span><strong>{a.label}</strong><small>{a.desc}</small></span><b style={{background:a.color+'30',color:a.color}}>{a.value}</b></Link>)}{!alerts.some(a=>n(a.value)>0)&&<div className="bf-p-empty"><CheckCircle2 size={20}/>{alerts.length?'Nenhuma pendência registrada.':'Indicadores indisponíveis.'}</div>}</div></section>
    </div>
   </div>
   <aside className="bf-p-right">
    {pdvEnabled&&<section className="bf-p-panel"><div className="bf-p-panel-heading"><span className="bf-p-icon green"><Wallet size={20}/></span><div><h2>Controle de caixa</h2><span className={own?'bf-p-positive':'bf-p-neutral'}>{own?'Caixa aberto':'Caixa fechado'}</span></div></div>{own?<div className="bf-p-mini-rows"><Link to={tenantPath('caixas')}><UserRound size={15}/><span>Operador: {own.operador?.nome||'Operador'}</span><ArrowRight size={14}/></Link><div><Clock size={15}/><span>Abertura: {new Date(own.abertoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div><div><Wallet size={15}/><span>Saldo atual:</span><b>{cash?.id===own.id?dinheiro(cash.saldo):'—'}</b></div>{(data?.caixasAtivos.length??0)>1&&<small>{data?.caixasAtivos.length} caixas abertos</small>}</div>:<Link className="bf-p-small-link" to={tenantPath('caixas')}>Controle de caixa <ArrowRight size={13}/></Link>}</section>}
    <section className="bf-p-panel"><div className="bf-p-panel-heading"><span className="bf-p-icon green"><BarChart3 size={20}/></span><h2>Resumo de hoje</h2></div><div className="bf-p-mini-rows"><div><ShoppingCart size={16}/><span>Vendas</span><b>{data?.totalVendasHoje??'—'}</b></div>{allowed('/delivery')&&<div><Truck size={16}/><span>Entregas (Delivery)</span><b>{daily?daily.filter(v=>v.tipoEntrega==='DELIVERY').length:'—'}</b></div>}<div><Users size={16}/><span>Novos clientes</span><b>{clients?clients.filter(c=>between(c,dates.today,shift(dates.today,1))).length:'—'}</b></div><div><Package size={16}/><span>Itens vendidos</span><b>{daily?daily.reduce((s,v)=>s+v.itens.reduce((a,i)=>a+(i.unidadesEstoque??i.quantidade),0),0):'—'}</b></div></div></section>
    <section className="bf-p-panel"><div className="bf-p-panel-heading"><span className="bf-p-icon green"><BarChart3 size={20}/></span><div><h2>Comparativo</h2><p>{periodLabel} × {compareLabel}</p></div></div><div className="bf-p-compare" style={{color:comparison===null?'#aeb7c2':comparison>=0?'#00dc83':'#ff526a'}}><strong>{comparison===null?'—':deltaText(comparison)}</strong>{series.length>0&&<Spark values={series.map(p=>p.faturamento)} color={comparison!==null&&comparison<0?'#ff526a':'#00dc83'}/>}</div><div className="bf-p-mini-rows"><div><span>Faturamento:</span><b>{dinheiro(revenue)}</b></div><div><span>{compareLabel}:</span><b>{prevRevenue===null?'—':dinheiro(prevRevenue)}</b></div></div></section>
   </aside>
  </div>}
  {ready&&!manager&&<div className="bf-p-operator">{pdvEnabled&&<section className="bf-p-panel"><div className="bf-p-panel-heading"><span className="bf-p-icon green"><Wallet size={20}/></span><h2>Meu caixa</h2></div><h3>{operacional?.caixaAberto?'Aberto':'Fechado'}</h3><Link className="bf-p-small-link" to={tenantPath('pdv')}>Acessar PDV <ArrowRight size={14}/></Link></section>}<section className="bf-p-panel"><div className="bf-p-panel-heading"><span className="bf-p-icon amber"><Package size={20}/></span><h2>Estoque baixo</h2></div><h3>{operacional?.estoqueBaixo??'—'}</h3><Link className="bf-p-small-link" to={tenantPath('estoque')+'?filtro=baixo'}>Consultar estoque <ArrowRight size={14}/></Link></section></div>}
  {updated&&<p className="bf-p-footnote">Última consulta: {updated.toLocaleTimeString('pt-BR')} · Fiado representa venda a prazo, não dinheiro recebido.</p>}
 </div>;
}
